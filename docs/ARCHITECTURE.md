# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # 클라 상태 머신(idle→generating→success/error), 후보 선택, 입력 보존, 취소
│   └── api/generate/route.ts    # formData 파싱 + 검증(크기/개수/MIME) + generate|edit 분기(toFile)
│                                #  + 서버 타임아웃 + export const maxDuration + mapError(4코드)
├── components/
│   ├── ThumbnailForm.tsx        # 프롬프트 + 제목 + 다중 이미지(드롭존 흡수) + 인라인 검증
│   ├── CandidateGallery.tsx     # 후보 3장 + 스켈레톤/에러 렌더 상태 + 선택
│   └── ThumbnailCanvas.tsx      # 선택본 + 제목 오버레이 + PNG export/다운로드
├── lib/
│   └── canvas.ts                # drawThumbnail()(배치 계산은 순수 함수로 추출) + exportPng()
└── types.ts                     # GenerateRequest/Result, Candidate, ApiError{code,message,retryable}
```

> 오버엔지니어링 금지: 호출처가 1곳(route)뿐인 OpenAI 호출·에러 매핑·입력 검증은 **route.ts에 인라인**한다.
> 별도 `services/`·`lib/errors`·`lib/validation` 모듈을 미리 만들지 않는다. `route.ts`가 120줄을 넘으면 그때 `services/openai.ts`를 추출한다.
> 단위 테스트를 위해 `mapError`와 `validate` 함수는 `route.ts`에서 **export**하고, OpenAI 클라이언트는 핸들러 내부에서 **지연 생성**한다(모듈 import 시 env/네트워크 영향 없음).

## 패턴
- Server Components 기본, 인터랙션이 필요한 곳(폼/상태/canvas)만 Client Component(`"use client"`).
- 외부 API는 Route Handler 경유. 컴포넌트에서 직접 호출 금지.
- 제목 오버레이/PNG export는 브라우저 canvas로만 처리(서버 이미지 라이브러리 미사용).

## 데이터 흐름
```
[입력] ThumbnailForm (프롬프트+제목+이미지)
  → POST /api/generate (multipart/form-data)
  → route: 검증(프롬프트 필수 / 4장·8MB·MIME) → 분기
       · 이미지 있음 → openai.images.edit(image: toFile[]…)
       · 이미지 없음 → openai.images.generate(…)
       params = { model:"gpt-image-2", size:"1280x720", quality:"medium", n:3, output_format:"webp" }
  → 성공: { candidates: [{ id, b64, mime:"image/webp" }] } (3장)
    실패: HTTP 상태 + { error: mapError(e) }  // { code, message, retryable }
  → [선택] CandidateGallery 에서 1장 선택
  → [합성] ThumbnailCanvas: 선택 b64 + titleText → 1280×720 canvas → PNG 다운로드
```

### 에러 흐름
업스트림(OpenAI) 예외/내부 오류 → `mapError(e)` → 4코드 정규화
(`INVALID_INPUT`/`CONTENT_POLICY`/`RATE_LIMITED`/`UPSTREAM_ERROR` + `retryable`) → route가 HTTP 상태+JSON 응답 → UI가 코드로 한국어 메시지/행동 렌더.

## 꼭 필요한 안전장치
1. 업로드 상한: 최대 4장, 각 ≤8MB, MIME 화이트리스트(png/jpeg/webp). 위반 → `INVALID_INPUT`.
2. 후보 응답은 `jpeg`(payload 절감). 최종 다운로드 PNG는 클라 canvas가 생성. (webp는 gpt-image-2가 무시하고 PNG 반환 — ADR-008)
3. 서버 타임아웃 + `export const maxDuration`(기본보다 길게, 생성 지연 대비) → 초과 시 `UPSTREAM_ERROR`.
4. `images.edit` 입력은 SDK `toFile()`로 파일화해 전달(파일명/MIME 누락 시 업스트림 400).

## 상태 관리
- 전역 상태 라이브러리 없음. `page.tsx`의 로컬 상태 머신(`useState`/`useReducer`)만 사용.
- 서버 상태는 단발성 fetch(저장/캐시 없음). 제목 변경은 클라 재렌더로 처리(재요청 없음).
