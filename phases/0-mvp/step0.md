# Step 0: setup-and-api

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL 규칙)
- `/docs/PRD.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`

이 step은 프로젝트 첫 step이다. 스캐폴드와 서버 API 레이어까지만 만든다. UI는 다음 step에서 만든다.

## 작업

### 1. 프로젝트 스캐폴드
- Next.js 15 (App Router) + TypeScript + React 프로젝트를 `src/` 디렉토리 기준으로 구성한다.
- 패키지 매니저는 npm. 의존성: `openai`, 테스트는 `vitest`(+ 필요한 타입). 린트는 `next lint`.
- `package.json` 스크립트: `dev`(next dev), `lint`(next lint), `build`(next build), `test`(vitest run).
- `.env.local`과 `.env.example`을 만든다. `.env.example`에는 `OPENAI_API_KEY=` 한 줄(값 비움). 실제 키는 커밋하지 마라.
- `.gitignore`에 `.env.local`, `node_modules`, `.next`가 포함되도록 한다.

### 2. 타입 — `src/types.ts`
다음 타입을 정의한다 (시그니처 수준):
```ts
export type ErrorCode = "INVALID_INPUT" | "CONTENT_POLICY" | "RATE_LIMITED" | "UPSTREAM_ERROR";
export interface ApiError { code: ErrorCode; message: string; retryable: boolean; }
export interface Candidate { id: string; b64: string; mime: "image/webp"; }
export interface GenerateResult { candidates: Candidate[]; }
// 요청은 multipart/form-data: prompt(string, 필수), titleText(string, 선택, 서버 미사용),
//   images(File 0~4장, 선택). 별도 타입은 필요 시 정의.
```

### 3. API Route — `src/app/api/generate/route.ts`
POST 핸들러. 흐름: `formData` 파싱 → 검증 → generate|edit 분기 → 응답.

- 생성 파라미터는 **파일 상단 상수**로 둔다:
  `MODEL="gpt-image-2"`, `SIZE="1280x720"`, `QUALITY="medium"`, `N=3`, `OUTPUT_FORMAT="webp"`.
- 업로드 상한 상수: 최대 4장, 각 ≤8MB, 허용 MIME `image/png`·`image/jpeg`·`image/webp`.
- **검증 함수 `validate`를 export**한다. 규칙: prompt 비어있으면 안 됨, 이미지 개수≤4, 각 크기≤8MB, MIME 화이트리스트. 위반 시 `INVALID_INPUT`.
- 분기:
  - 이미지 ≥1장 → `openai.images.edit({ model, image: <File들을 toFile()로 변환한 배열>, prompt, size, quality, n, output_format })`
  - 이미지 0장 → `openai.images.generate({ model, prompt, size, quality, n, output_format })`
  - `openai`의 `toFile`(`openai/uploads`)로 업로드 File을 파일화해 전달한다. 이유: 파일명/MIME 누락 시 업스트림 400.
- OpenAI 클라이언트는 **핸들러 내부에서 지연 생성**한다(`new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`). 모듈 최상단에서 생성하지 마라. 이유: 테스트에서 import만 해도 env가 필요해지는 것을 막는다.
- 응답: 성공 시 `{ candidates: [{ id, b64, mime:"image/webp" }] }` (응답의 base64는 `b64_json`에서 꺼낸다). 실패 시 `mapError`가 만든 `{ error: ApiError }` + 적절한 HTTP 상태(INVALID_INPUT/CONTENT_POLICY→400, RATE_LIMITED→429, UPSTREAM_ERROR→502).
- 서버 타임아웃을 두고(예: AbortController로 OpenAI 호출에 제한 시간), 파일 상단에 `export const maxDuration = 60;`을 둔다. 타임아웃 초과는 `UPSTREAM_ERROR`.

### 4. 에러 매핑 — `mapError` (route.ts에서 export)
업스트림 예외/내부 오류를 4코드로 정규화하는 **순수 함수**를 만들고 export한다:
```ts
export function mapError(e: unknown): ApiError
```
- 입력 검증 실패 → `INVALID_INPUT` (retryable:false)
- 모더레이션/정책 차단(OpenAI 400 + content policy 류) → `CONTENT_POLICY` (false)
- 429 / rate limit / quota / billing → `RATE_LIMITED` (true)
- 그 외(401, 타임아웃, 5xx, 네트워크) → `UPSTREAM_ERROR` (true)
- 각 코드에 한국어 `message`를 채운다(`docs/UI_GUIDE.md`의 메시지와 일치).

> 별도 `services/`·`lib/errors`·`lib/validation` 모듈을 만들지 마라. 전부 route.ts에 인라인하고 `validate`/`mapError`만 export한다 (ADR-009).

## Acceptance Criteria

```bash
npm run lint    # 정적 분석 통과
npm run build   # 컴파일 에러 없음
npm test        # 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/ARCHITECTURE.md` 디렉토리 구조(`src/app`, `src/types.ts`)를 따르는가?
   - CLAUDE.md CRITICAL: OpenAI 호출/키가 서버(route)에만 있는가? 파라미터가 상수화됐는가? 업로드 상한이 강제되는가? 에러가 4코드로 정규화되는가?
   - `services/`·`lib/errors` 등 불필요 계층을 만들지 않았는가? (ADR-009)
3. 테스트(TDD, OpenAI SDK는 모킹, **실제 네트워크 호출 금지**):
   - `mapError`: 4코드 각각으로 매핑되는지 + `retryable` 값.
   - `validate`: prompt 누락 / 5장 / 8MB 초과 / 잘못된 MIME → `INVALID_INPUT`.
4. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약(생성 파일·핵심 결정)"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 중단

## 금지사항

- UI 페이지/컴포넌트/canvas를 만들지 마라. 이유: 이 step은 서버 API까지만. UI는 step 1.
- API 키를 하드코딩하거나 `NEXT_PUBLIC_`로 노출하지 마라. 이유: 키 유출.
- OpenAI 클라이언트를 모듈 최상단에서 생성하지 마라. 이유: import만으로 env 의존이 생겨 테스트가 깨진다.
- 테스트에서 실제 OpenAI 네트워크를 호출하지 마라. 이유: 비용·불안정.
- `services/`·`lib/errors`·`lib/validation` 등 별도 계층을 만들지 마라. 이유: 호출처 1곳, 조기 추상화 금지 (ADR-009).
- 기존 테스트를 깨뜨리지 마라.
