# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 마케팅 랜딩이 아니라 매일 쓰는 제작 도구.
2. 한국어. 입력 → 생성 → 선택 → 다운로드의 흐름이 한 화면에서 명확해야 한다.
3. 생성이 느린(n=3·medium 실측 ~40~70초) 서비스다. 진행 상태와 에러는 항상 정직하게, 다음 행동과 함께 보여준다.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | #0a0a0a |
| 카드 | #141414 |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | text-white |
| 본문 | text-neutral-300 |
| 보조 | text-neutral-400 |
| 비활성 | text-neutral-500 |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 성공/선택됨 | #22c55e |
| 에러 | #ef4444 |
| 경고/대기 | #f59e0b |
| 중립/기본 | #525252 |

## 컴포넌트
### 카드
```
rounded-lg bg-[#141414] border border-neutral-800 p-6
```

### 버튼
```
Primary: rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed
Text:    text-neutral-500 hover:text-neutral-300
Danger/Retry: rounded-lg border border-neutral-700 text-neutral-200 hover:border-neutral-500
```

### 입력 필드
```
rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 focus:border-neutral-600 outline-none
```

## 화면별 사양

### 진입 / 입력
- 상단: 한 줄 소개 + **예시 프롬프트 칩**(클릭 시 프롬프트 자동 채움) — 온보딩.
- 본문 1열: 프롬프트 textarea(필수) → 제목 input(선택) → 이미지 다중 드롭존(선택) → "썸네일 생성" 버튼.
- 드롭존: 업로드된 이미지 **썸네일 + 삭제(X)**. 비이미지/8MB 초과/4장 초과는 인라인 에러로 거부.
- 프롬프트 빈값이면 생성 버튼 비활성 + 도움말("썸네일에 담고 싶은 내용을 적어주세요").

### 생성 중 (generating)
- 버튼 → 스피너 + "생성 중…", 폼 입력 비활성.
- **후보 자리 3개 스켈레톤** + **경과 타이머**(예: "12초") + **취소 버튼**.
- 취소 시 조용히 입력 화면으로 복귀(입력 보존).

### 결과 (success)
- 후보 **3장 그리드**(선택 시 #22c55e 테두리 하이라이트).
- 선택하면 하단에 **16:9 미리보기 카드** — 제목 오버레이가 반영됨.
- 제목 input 변경 → 미리보기 즉시 갱신(재요청 없음).
- 액션: "PNG 다운로드"(Primary), "다시 생성"(Text — 같은 입력 재사용).

### 에러 (error)
- ErrorBanner: 코드별 한국어 메시지 + 행동 버튼.
  - `INVALID_INPUT` → 입력 수정 유도(재시도 버튼 없음).
  - `CONTENT_POLICY` → "표현을 바꿔보세요" + 프롬프트로 포커스.
  - `RATE_LIMITED` → 카운트다운 후 "다시 시도".
  - `UPSTREAM_ERROR` → "다시 시도".
- 입력값은 항상 보존.

## 레이아웃
- 전체 너비: max-w-3xl, 좌측 정렬 기본(중앙 정렬 금지).
- 간격: gap-3~4, 섹션 간 space-y-8.
- 반응형: 모바일 1열, 후보 그리드는 화면폭에 따라 1~3열.

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | text-2xl font-semibold text-white |
| 섹션/카드 제목 | text-sm font-medium text-neutral-400 |
| 본문 | text-sm text-neutral-300 leading-relaxed |

## 썸네일 오버레이(canvas) 스타일
- 출력 1280×720. 제목은 **하단 스크림(반투명 검정 그라데이션 띠) 위에 굵은 텍스트 + 외곽선**으로 가독성 보장.
- 폰트 크기는 텍스트 길이에 따라 자동 축소(한 줄 우선, 너무 길면 줄바꿈).
- 위치/색 커스터마이즈는 MVP 제외(고정).

## 애니메이션
- 허용: fade-in(0.2~0.4s), 스피너 회전. 그 외 모든 장식 애니메이션 금지.

## 접근성
- 버튼 `aria-label`, 후보 이미지 `alt`, 로딩 영역 `aria-live="polite"`, 키보드 포커스 순서 보장.

## 아이콘
- SVG 인라인, strokeWidth 1.5. 아이콘을 둥근 배경 박스로 감싸지 않는다.
