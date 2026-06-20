# 프로젝트: YouTube 썸네일 생성기

> 유튜버가 프롬프트(+선택 이미지)를 주면 OpenAI `gpt-image-2`로 1280×720 썸네일 후보 3장을
> 생성하고, 사용자가 1장을 골라 제목 텍스트를 얹어 PNG로 다운로드하는 서비스.
> execute.py는 매 step 프롬프트에 이 파일 전체를 가드레일로 주입한다. 아래 CRITICAL 규칙은 모든 step에서 강제된다.

## 기술 스택
- TypeScript
- Next.js 15 (App Router) + React
- npm
- openai SDK (모델: `gpt-image-2`)

## 아키텍처 규칙
- CRITICAL: OpenAI 호출과 `OPENAI_API_KEY`는 **서버에서만**(`src/app/api/**`) 사용한다. 컴포넌트/클라이언트 코드에서 직접 호출하거나 키를 노출하지 마라. `NEXT_PUBLIC_` 접두사로 키를 노출하지 마라. 이유: 키 유출 방지.
- CRITICAL: gpt-image-2 호출 파라미터(`model`, `size`, `quality`, `n`, `output_format`)는 한 곳에서 상수로 관리한다. 값: `gpt-image-2` / `1280x720` / `medium` / `n:3` / 후보는 `webp`.
- CRITICAL: 제목 텍스트 오버레이와 PNG 다운로드는 **클라이언트 canvas에서만** 처리한다. AI에게 글자를 그리게 하지 마라(철자 깨짐). 서버사이드 이미지 처리 라이브러리(sharp 등)를 도입하지 마라.
- CRITICAL: 업스트림/내부 에러는 반드시 `mapError`로 4개 코드(`INVALID_INPUT` | `CONTENT_POLICY` | `RATE_LIMITED` | `UPSTREAM_ERROR`) 중 하나로 정규화해 `{ code, message, retryable }`로 반환한다. UI는 코드만 보고 한국어 메시지/행동을 렌더한다.
- CRITICAL: 업로드는 **최대 4장, 각 8MB 이하, image/png·image/jpeg·image/webp만** 허용한다. 클라와 route 양쪽에서 검증한다(route가 신뢰 경계). 위반은 `INVALID_INPUT`.
- 오버엔지니어링 금지: 호출처가 1곳뿐인 로직을 위해 `services/`·`lib/errors`·`lib/validation` 같은 별도 계층/모듈을 미리 만들지 마라. route 핸들러에 인라인하고, `route.ts`가 120줄을 넘으면 그때 추출한다.
- 디렉토리: `src/app`(페이지+API), `src/components`(UI), `src/lib`(canvas 등 순수/클라 유틸), `src/types.ts`(타입 한 파일). 자세한 건 `docs/ARCHITECTURE.md`를 따른다.

## 개발 프로세스
- CRITICAL: 순수 함수/매핑 로직(`mapError`, 입력 검증, canvas 배치 계산)은 테스트를 먼저 작성하고 통과하는 구현을 작성한다 (TDD). UI 컴포넌트와 외부 API 호출은 SDK를 모킹해 단위 테스트하고, 실제 네트워크 호출은 테스트에서 금지한다.
- 커밋 메시지는 conventional commits 형식을 따른다 (feat:, fix:, docs:, refactor:).

## 명령어
> 아래 lint / build / test 커맨드는 `.claude/settings.json`의 Stop 훅 검증 커맨드와 일치한다.

npm run lint     # 정적 분석 (next lint)
npm run build    # 빌드 / 컴파일 (next build)
npm test         # 테스트 (vitest run)
