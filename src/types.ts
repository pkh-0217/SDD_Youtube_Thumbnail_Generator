export type ErrorCode =
  | "INVALID_INPUT"
  | "CONTENT_POLICY"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface Candidate {
  id: string;
  b64: string;
  // gpt-image-2가 실제 반영하는 포맷(webp는 무시되고 PNG로 돌아오는 이슈가 있어 jpeg 사용).
  mime: "image/jpeg";
}

export interface GenerateResult {
  candidates: Candidate[];
}
