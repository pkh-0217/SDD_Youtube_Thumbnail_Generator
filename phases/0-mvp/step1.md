# Step 1: ui-and-canvas

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL 규칙)
- `/docs/UI_GUIDE.md` (화면별 사양 — 이 step의 기준)
- `/docs/ARCHITECTURE.md`
- step 0 산출물: `/src/types.ts`, `/src/app/api/generate/route.ts` (요청/응답 계약을 그대로 사용)

step 0에서 만든 API 계약(요청 multipart, 응답 `{ candidates }` / `{ error }`)을 읽고, 그 모양에 맞춰 UI를 붙인다.

## 작업

### 1. canvas 유틸 — `src/lib/canvas.ts`
- `drawThumbnail(ctx, { imageBitmap, titleText })` 로 1280×720 캔버스에 이미지 + 제목을 합성한다.
  - 제목 스타일: **하단 스크림(반투명 검정 그라데이션) + 굵은 텍스트 + 외곽선**. 폰트 크기는 텍스트 길이에 따라 자동 축소, 너무 길면 줄바꿈.
  - **배치 계산(폰트 크기, 줄바꿈, y좌표)은 순수 함수로 추출**한다. 예: `computeTitleLayout(text, canvasW, canvasH): { lines, fontSize, ... }`. 이유: canvas 없이 단위 테스트 가능하게.
- `exportPng(canvas): Promise<Blob>` + 다운로드 트리거 헬퍼. 다운로드 파일명 예: `thumbnail.png`.
- 위치/색 커스터마이즈는 만들지 않는다(MVP 고정, ADR-004).

### 2. 컴포넌트 — `src/components/`
모두 Client Component(`"use client"`). `docs/UI_GUIDE.md` 화면 사양을 따른다.
- `ThumbnailForm.tsx`: 프롬프트 textarea(필수) + 제목 input(선택) + **다중 이미지 드롭존(흡수)**.
  - 드롭존: 썸네일 미리보기 + 삭제(X). **인라인 검증**: 비이미지/8MB 초과/4장 초과 거부(route와 동일 규칙).
  - 예시 프롬프트 칩(클릭 시 프롬프트 채움). 프롬프트 빈값이면 제출 버튼 비활성.
- `CandidateGallery.tsx`: 후보 3장 그리드 + 선택(선택 하이라이트). **스켈레톤 3개**(로딩)와 에러 렌더 상태를 이 영역에서 처리.
- `ThumbnailCanvas.tsx`: 선택된 후보 b64 + 제목 → `lib/canvas`로 16:9 미리보기 렌더 + "PNG 다운로드". 제목 변경 시 즉시 재렌더(재요청 없음).

### 3. 페이지 — `src/app/page.tsx`
- 클라이언트 **상태 머신**: `idle → generating → (success | error)`.
- 생성: `POST /api/generate`에 multipart로 prompt/titleText/images 전송. **AbortController**로 취소 지원.
- 로딩: 스켈레톤 3 + 경과 타이머 + 취소 버튼(UI_GUIDE 생성 중 사양).
- 성공: 후보 표시 → 선택 → 미리보기/다운로드.
- 에러: 응답 `{ error: { code, message, retryable } }`를 코드별로 렌더(메시지 + 행동 버튼). `retryable`이면 재시도 버튼.
- **입력 보존**: 에러/취소 시 사용자가 입력한 prompt/title/images를 절대 잃지 않는다.

## Acceptance Criteria

```bash
npm run lint    # 정적 분석 통과
npm run build   # 컴파일 에러 없음
npm test        # 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `docs/UI_GUIDE.md` 화면 사양(입력/생성중/결과/에러)을 따르는가? AI 슬롭 안티패턴을 피했는가?
   - CLAUDE.md CRITICAL: 컴포넌트에서 OpenAI를 직접 호출하지 않는가? 오버레이/다운로드가 클라 canvas로만 처리되는가? 서버 이미지 라이브러리를 도입하지 않았는가?
   - step 0의 route/types를 재사용하는가(재구현 금지)?
3. 테스트(TDD):
   - `computeTitleLayout` 등 배치 계산 순수 함수.
   - 폼 검증(프롬프트 빈값 제출 차단, 이미지 4장/8MB/ MIME 거부), 후보 선택 동작, 에러 코드별 렌더(메시지/행동 버튼).
4. 수동 E2E 절차를 step summary 또는 README에 문서화한다(아래 "수동 E2E" 참조).
5. 결과에 따라 `phases/0-mvp/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "..."`
   - 수정 3회 실패 → `"status": "error"`, `"error_message": "..."`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "..."` 후 중단

### 수동 E2E (문서화 대상)
`OPENAI_API_KEY` 설정 후 `npm run dev`:
- 프롬프트만으로 후보 3장 생성 → 1장 선택 → 제목 입력 즉시 반영 → PNG 다운로드.
- 이미지(사진+로고) 첨부 후 생성(edit 경로).
- 에러: 빈 프롬프트(버튼 비활성), 대용량/과다 이미지(인라인 거부), 생성 중 취소(입력 보존 복귀).

## 금지사항

- step 0의 `route.ts`/`types.ts`를 재구현하지 마라. 이유: 단일 소스 유지. 계약이 부족하면 최소한으로 확장만 한다.
- 컴포넌트/클라이언트에서 OpenAI를 직접 호출하거나 키를 참조하지 마라. 이유: 키 유출.
- 서버사이드 이미지 처리 라이브러리(sharp 등)를 도입하지 마라. 이유: 오버레이/다운로드는 클라 canvas로 충분.
- 제목 오버레이의 위치/색 컨트롤을 만들지 마라. 이유: MVP 스코프 밖(ADR-004).
- 기존 테스트를 깨뜨리지 마라.
