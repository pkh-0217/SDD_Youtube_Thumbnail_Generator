import { describe, expect, it } from "vitest";
import { MAX_BYTES, validateImages } from "./imageValidation";

const f = (type: string, size = 1024) => ({ type, size });

describe("validateImages", () => {
  it("accepts up to 4 allowed images", () => {
    expect(validateImages([])).toBeNull();
    expect(validateImages([f("image/png"), f("image/jpeg"), f("image/webp"), f("image/png")])).toBeNull();
  });

  it("rejects more than 4 images", () => {
    expect(validateImages(Array.from({ length: 5 }, () => f("image/png")))).toMatch(/4장/);
  });

  it("rejects a disallowed MIME type", () => {
    expect(validateImages([f("image/gif")])).toMatch(/PNG/);
  });

  it("rejects an image larger than 8MB", () => {
    expect(validateImages([f("image/png", MAX_BYTES + 1)])).toMatch(/8MB/);
  });
});
