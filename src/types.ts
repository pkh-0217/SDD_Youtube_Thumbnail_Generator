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
  mime: "image/webp";
}

export interface GenerateResult {
  candidates: Candidate[];
}
