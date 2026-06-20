# 프로젝트: {프로젝트명}

> 이 파일은 Harness 프레임워크 템플릿의 placeholder다. `{...}` 부분을 실제 프로젝트에 맞게 채워라.
> execute.py는 매 step 프롬프트에 이 파일 전체를 가드레일로 주입한다. 따라서 여기 적힌
> CRITICAL 규칙은 모든 step에서 강제된다. 추상적인 말 대신 검증 가능한 규칙만 적어라.

## 기술 스택
- {언어 / 런타임 (예: TypeScript, Python 3.11, Go 1.22)}
- {프레임워크 (예: Next.js 15, FastAPI, Spring Boot)}
- {빌드 / 패키지 도구 (예: npm, uv/pip, gradle)}

## 아키텍처 규칙
- CRITICAL: {절대 지켜야 할 규칙 1 — 예: 모든 외부 I/O는 지정된 레이어에서만 처리}
- CRITICAL: {절대 지켜야 할 규칙 2 — 예: UI 레이어에서 직접 외부 API를 호출하지 말 것}
- {일반 규칙 — 예: 모듈 / 타입 / 테스트의 디렉토리 배치 규칙}

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
> 아래는 placeholder다. 실제 프로젝트의 검증 커맨드로 교체하라.
> 여기 적은 lint / build / test 커맨드는 `.claude/settings.json`의 Stop 훅 검증 커맨드와
> 반드시 일치시켜라. 그래야 매 작업 후 동일한 품질 게이트가 돈다.

{lint-command}     # 정적 분석   (예: npm run lint  / ruff check .)
{build-command}    # 빌드 / 컴파일 (예: npm run build / go build ./...)
{test-command}     # 테스트       (예: npm test      / pytest)
