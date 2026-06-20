# YouTube 썸네일 생성기

프롬프트(+선택 이미지)로 `gpt-image-2` 썸네일 후보 3장을 생성하고, 1장을 골라 제목을 얹어 PNG로 내려받는 도구.

## 개발

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint   # 정적 분석
npm run build  # 프로덕션 빌드
npm test       # 단위 테스트 (vitest)
```

`OPENAI_API_KEY`를 `.env.local`에 설정해야 생성이 동작한다(서버 전용, 클라이언트에 노출 금지).

```
OPENAI_API_KEY=sk-...
```

## 수동 E2E

`OPENAI_API_KEY` 설정 후 `npm run dev`로 확인한다.

1. **기본 생성**: 프롬프트만 입력 → "썸네일 생성" → 스켈레톤 3개 + 경과 타이머 표시 → 후보 3장 등장 → 1장 선택(녹색 테두리) → 하단 미리보기에 반영.
2. **제목 오버레이**: 제목 input에 텍스트 입력 → 미리보기가 **재요청 없이** 즉시 갱신(하단 스크림 + 외곽선) → "PNG 다운로드"로 `thumbnail.png` 저장.
3. **이미지 반영(edit 경로)**: 사진/로고 등 1~4장 첨부 후 생성 → 업로드 썸네일 + 삭제(X) 동작 확인.
4. **검증**: 빈 프롬프트면 생성 버튼 비활성. 비이미지/8MB 초과/4장 초과는 제출 전 인라인으로 거부.
5. **취소/입력 보존**: 생성 중 "취소" → 입력 화면으로 복귀하되 프롬프트·제목·이미지 보존.
6. **에러**: 코드별(`INVALID_INPUT`/`CONTENT_POLICY`/`RATE_LIMITED`/`UPSTREAM_ERROR`) 메시지와 행동 버튼(재시도/프롬프트 수정) 렌더, 입력값 보존.
