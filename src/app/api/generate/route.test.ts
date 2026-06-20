import { describe, expect, it } from "vitest";
import { mapError, validate } from "./lib";

function file(name: string, type: string, sizeBytes: number): File {
  // Construct a File of a given byte size without allocating huge buffers eagerly.
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("mapError", () => {
  it("maps content policy / safety rejections to CONTENT_POLICY (not retryable)", () => {
    const e = {
      status: 400,
      code: "content_policy_violation",
      message: "Your request was rejected as a result of our safety system.",
    };
    const out = mapError(e);
    expect(out.code).toBe("CONTENT_POLICY");
    expect(out.retryable).toBe(false);
    expect(out.message.length).toBeGreaterThan(0);
  });

  it("maps 429 / rate limit / quota to RATE_LIMITED (retryable)", () => {
    const out = mapError({ status: 429, message: "Rate limit reached for images." });
    expect(out.code).toBe("RATE_LIMITED");
    expect(out.retryable).toBe(true);
  });

  it("maps a generic 400 bad request to INVALID_INPUT (not retryable)", () => {
    const out = mapError({ status: 400, message: "Invalid value for 'prompt'." });
    expect(out.code).toBe("INVALID_INPUT");
    expect(out.retryable).toBe(false);
  });

  it("maps 401 / 5xx / network / timeout to UPSTREAM_ERROR (retryable)", () => {
    expect(mapError({ status: 401, message: "Unauthorized" }).code).toBe("UPSTREAM_ERROR");
    expect(mapError({ status: 500, message: "server error" }).code).toBe("UPSTREAM_ERROR");
    expect(mapError(new Error("network down")).code).toBe("UPSTREAM_ERROR");
    const abort = mapError({ name: "AbortError", message: "The operation was aborted" });
    expect(abort.code).toBe("UPSTREAM_ERROR");
    expect(abort.retryable).toBe(true);
  });

  it("passes through an already-normalized ApiError code", () => {
    const out = mapError({ code: "CONTENT_POLICY", message: "x", retryable: true });
    expect(out.code).toBe("CONTENT_POLICY");
    expect(out.retryable).toBe(false);
  });
});

describe("validate", () => {
  it("returns null for a valid prompt with no images", () => {
    expect(validate("고양이 썸네일", [])).toBeNull();
  });

  it("returns null for a valid prompt with allowed images", () => {
    const imgs = [file("a.png", "image/png", 1024), file("b.jpg", "image/jpeg", 2048)];
    expect(validate("프롬프트", imgs)).toBeNull();
  });

  it("rejects an empty / whitespace prompt as INVALID_INPUT", () => {
    expect(validate("", [])?.code).toBe("INVALID_INPUT");
    expect(validate("   ", [])?.code).toBe("INVALID_INPUT");
  });

  it("rejects more than 4 images as INVALID_INPUT", () => {
    const imgs = Array.from({ length: 5 }, (_, i) => file(`${i}.png`, "image/png", 1024));
    const out = validate("프롬프트", imgs);
    expect(out?.code).toBe("INVALID_INPUT");
    expect(out?.retryable).toBe(false);
  });

  it("rejects an image larger than 8MB as INVALID_INPUT", () => {
    const imgs = [file("big.png", "image/png", 8 * 1024 * 1024 + 1)];
    expect(validate("프롬프트", imgs)?.code).toBe("INVALID_INPUT");
  });

  it("rejects a disallowed MIME type as INVALID_INPUT", () => {
    const imgs = [file("doc.gif", "image/gif", 1024)];
    expect(validate("프롬프트", imgs)?.code).toBe("INVALID_INPUT");
  });
});
