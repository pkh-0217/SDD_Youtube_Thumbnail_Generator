import { describe, expect, it } from "vitest";
import { computeTitleLayout, THUMB_H, THUMB_W } from "./canvas";

const BASE_FONT = Math.round(THUMB_H * 0.12); // 86
const MIN_FONT = Math.round(THUMB_H * 0.06); // 43

describe("computeTitleLayout", () => {
  it("returns no lines for empty / whitespace text", () => {
    expect(computeTitleLayout("", THUMB_W, THUMB_H).lines).toEqual([]);
    expect(computeTitleLayout("   ", THUMB_W, THUMB_H).lines).toEqual([]);
  });

  it("keeps short text on a single line at the base font size", () => {
    const layout = computeTitleLayout("오늘의 추천", THUMB_W, THUMB_H);
    expect(layout.lines).toHaveLength(1);
    expect(layout.fontSize).toBe(BASE_FONT);
  });

  it("shrinks the font for long text so it fits within the target line count", () => {
    const long =
      "이번 영상에서 절대 놓치면 안 되는 충격적인 반전 결말 총정리 완벽 가이드 끝까지 꼭 보세요 구독과 좋아요 부탁드립니다";
    const layout = computeTitleLayout(long, THUMB_W, THUMB_H);
    expect(layout.fontSize).toBeLessThan(BASE_FONT);
    expect(layout.fontSize).toBeGreaterThanOrEqual(MIN_FONT);
    expect(layout.lines.length).toBeGreaterThanOrEqual(2);
    expect(layout.lines.length).toBeLessThanOrEqual(3);
  });

  it("never lets a line exceed the usable width", () => {
    const long =
      "이번 영상에서 절대 놓치면 안 되는 충격적인 반전 결말 총정리 완벽 가이드 끝까지 꼭 보세요 구독과 좋아요 부탁드립니다";
    const layout = computeTitleLayout(long, THUMB_W, THUMB_H);
    const charW = layout.fontSize * 0.58;
    for (const line of layout.lines) {
      expect(line.length * charW).toBeLessThanOrEqual(layout.maxWidth + charW);
    }
  });

  it("places the scrim band at the bottom of the canvas", () => {
    const layout = computeTitleLayout("제목", THUMB_W, THUMB_H);
    expect(layout.scrimTop).toBeGreaterThan(0);
    expect(layout.scrimTop + layout.scrimHeight).toBeLessThanOrEqual(THUMB_H);
    expect(layout.startY).toBeLessThanOrEqual(THUMB_H);
  });
});
