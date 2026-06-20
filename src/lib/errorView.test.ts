import { describe, expect, it } from "vitest";
import { errorView } from "./errorView";
import type { ApiError } from "@/types";

const err = (over: Partial<ApiError>): ApiError => ({
  code: "UPSTREAM_ERROR",
  message: "msg",
  retryable: true,
  ...over,
});

describe("errorView", () => {
  it("shows a retry button for retryable errors (RATE_LIMITED / UPSTREAM_ERROR)", () => {
    expect(errorView(err({ code: "RATE_LIMITED", retryable: true })).retryLabel).toBe("다시 시도");
    expect(errorView(err({ code: "UPSTREAM_ERROR", retryable: true })).retryable).toBe(true);
  });

  it("hides retry for non-retryable input/policy errors", () => {
    expect(errorView(err({ code: "INVALID_INPUT", retryable: false })).retryLabel).toBeNull();
    expect(errorView(err({ code: "CONTENT_POLICY", retryable: false })).retryable).toBe(false);
  });

  it("focuses the prompt only for CONTENT_POLICY", () => {
    expect(errorView(err({ code: "CONTENT_POLICY", retryable: false })).focusPrompt).toBe(true);
    expect(errorView(err({ code: "INVALID_INPUT", retryable: false })).focusPrompt).toBe(false);
  });

  it("passes through the server message", () => {
    expect(errorView(err({ message: "정책에 위배되는 표현이 있어요." })).message).toBe(
      "정책에 위배되는 표현이 있어요.",
    );
  });
});
