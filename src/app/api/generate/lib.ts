// 라우트-로컬 헬퍼. Next 15는 `route.ts`에서 핸들러(POST 등) 외의 export를 금지하므로
// 단위 테스트 대상인 순수 함수(validate, mapError)는 같은 폴더의 이 파일에 둔다.
// (전역 services/·lib/errors 계층이 아니라 호출처와 같은 디렉토리에 두는 최소 분리 — ADR-009 취지 유지)
import type { ApiError, ErrorCode } from "@/types";

// --- 업로드 상한 ---
export const MAX_IMAGES = 4;
export const MAX_BYTES = 8 * 1024 * 1024;
export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

const MESSAGES: Record<ErrorCode, string> = {
  INVALID_INPUT: "입력값을 확인해주세요.",
  CONTENT_POLICY: "정책에 위배되는 표현이 있어요. 표현을 바꿔보세요.",
  RATE_LIMITED: "요청이 많아요. 잠시 후 다시 시도해주세요.",
  UPSTREAM_ERROR: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
};

const RETRYABLE: Record<ErrorCode, boolean> = {
  INVALID_INPUT: false,
  CONTENT_POLICY: false,
  RATE_LIMITED: true,
  UPSTREAM_ERROR: true,
};

export const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  CONTENT_POLICY: 400,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
};

function apiError(code: ErrorCode, message: string = MESSAGES[code]): ApiError {
  return { code, message, retryable: RETRYABLE[code] };
}

/** 입력 검증(route가 신뢰 경계). 위반 시 INVALID_INPUT, 통과 시 null. */
export function validate(prompt: string, images: File[]): ApiError | null {
  if (!prompt || !prompt.trim()) {
    return apiError("INVALID_INPUT", "프롬프트를 입력해주세요.");
  }
  if (images.length > MAX_IMAGES) {
    return apiError("INVALID_INPUT", "이미지는 최대 4장까지 업로드할 수 있어요.");
  }
  for (const img of images) {
    if (img.size > MAX_BYTES) {
      return apiError("INVALID_INPUT", "이미지는 각 8MB 이하만 업로드할 수 있어요.");
    }
    if (!ALLOWED_MIME.includes(img.type)) {
      return apiError("INVALID_INPUT", "PNG·JPEG·WEBP 이미지만 업로드할 수 있어요.");
    }
  }
  return null;
}

/** 업스트림 예외/내부 오류를 4코드로 정규화하는 순수 함수. */
export function mapError(e: unknown): ApiError {
  const err = e as Record<string, unknown> | null;

  // 이미 정규화된 ApiError면 그대로 통과(코드 기준 재구성).
  const known: ErrorCode[] = ["INVALID_INPUT", "CONTENT_POLICY", "RATE_LIMITED", "UPSTREAM_ERROR"];
  if (err && typeof err.code === "string" && known.includes(err.code as ErrorCode)) {
    return apiError(err.code as ErrorCode);
  }

  const status = Number(err?.status ?? err?.statusCode ?? 0);
  const haystack = [err?.message, err?.code, err?.type, err?.name]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();

  if (/content.?policy|safety|moderation/.test(haystack)) {
    return apiError("CONTENT_POLICY");
  }
  if (status === 429 || /rate.?limit|quota|billing|too many requests/.test(haystack)) {
    return apiError("RATE_LIMITED");
  }
  // 키/접근 권한(조직 인증) 오류: 코드는 UPSTREAM_ERROR로 유지하되, 운영자가 바로잡을 수 있게
  // 메시지를 구체화하고 재시도를 끈다(대기로 해결되지 않는 설정 오류).
  if (
    status === 401 ||
    status === 403 ||
    /missing or empty|missing api key|incorrect api key|api key|unauthorized|forbidden|must be verified|verification/.test(
      haystack,
    )
  ) {
    return {
      code: "UPSTREAM_ERROR",
      message: "OpenAI API 키 또는 조직 인증 설정을 확인해주세요(서버 .env.local / OpenAI 콘솔의 Organization verification).",
      retryable: false,
    };
  }
  if (status === 400 || /invalid|validation/.test(haystack)) {
    return apiError("INVALID_INPUT");
  }
  return apiError("UPSTREAM_ERROR");
}
