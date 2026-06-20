// 에러 코드 → UI 행동 매핑. 메시지는 route가 내려준 한국어 message를 그대로 쓰고,
// 코드별로 "행동 버튼/포커스 유도"만 결정한다(UI_GUIDE 에러 섹션).
import type { ApiError } from "@/types";

export interface ErrorView {
  message: string;
  /** 재시도 버튼을 보여줄지(= retryable). RATE_LIMITED / UPSTREAM_ERROR. */
  retryable: boolean;
  retryLabel: string | null;
  /** 프롬프트로 포커스를 유도할지. CONTENT_POLICY("표현을 바꿔보세요"). */
  focusPrompt: boolean;
}

export function errorView(error: ApiError): ErrorView {
  return {
    message: error.message,
    retryable: error.retryable,
    retryLabel: error.retryable ? "다시 시도" : null,
    focusPrompt: error.code === "CONTENT_POLICY",
  };
}
