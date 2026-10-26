import { describe, expect, it } from "vitest";
import { clampCropArea, isFullCropArea, MIN_CROP_SIZE, resizeCropArea } from "./image-crop";
import type { CropAreaType } from "./image-crop";

const AREA: CropAreaType = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };

function expectArea(actual: CropAreaType, expected: CropAreaType): void {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.width).toBeCloseTo(expected.width);
  expect(actual.height).toBeCloseTo(expected.height);
}

describe("resizeCropArea", () => {
  it("moves only the top edge for the top side", () => {
    expectArea(resizeCropArea(AREA, "top", 0.1, 0.1), { x: 0.2, y: 0.3, width: 0.6, height: 0.5 });
  });

  it("moves only the right edge for the right side", () => {
    expectArea(resizeCropArea(AREA, "right", -0.1, 0.3), { x: 0.2, y: 0.2, width: 0.5, height: 0.6 });
  });

  it("moves only the bottom edge for the bottom side", () => {
    expectArea(resizeCropArea(AREA, "bottom", 0.3, 0.1), { x: 0.2, y: 0.2, width: 0.6, height: 0.7 });
  });

  it("moves only the left edge for the left side", () => {
    expectArea(resizeCropArea(AREA, "left", -0.1, -0.1), { x: 0.1, y: 0.2, width: 0.7, height: 0.6 });
  });

  it("moves two edges for a corner", () => {
    expectArea(resizeCropArea(AREA, "bottom-left", 0.1, 0.1), { x: 0.3, y: 0.2, width: 0.5, height: 0.7 });
  });

  it("stops an edge at the image border", () => {
    expectArea(resizeCropArea(AREA, "top-right", 0.5, -0.5), { x: 0.2, y: 0, width: 0.8, height: 0.8 });
  });

  it("keeps the minimum size when an edge is dragged past the opposite one", () => {
    const area = resizeCropArea(AREA, "left", 0.9, 0);

    expect(area.width).toBeCloseTo(MIN_CROP_SIZE);
    expect(area.x + area.width).toBeCloseTo(0.8);
  });
});

describe("clampCropArea", () => {
  it("keeps a moved area inside the image without resizing it", () => {
    expectArea(clampCropArea({ ...AREA, x: 0.7, y: -0.2 }), { x: 0.4, y: 0, width: 0.6, height: 0.6 });
  });
});

describe("isFullCropArea", () => {
  it("tells the whole image from a crop", () => {
    expect(isFullCropArea({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
    expect(isFullCropArea(AREA)).toBe(false);
  });
});
