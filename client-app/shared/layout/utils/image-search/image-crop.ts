/** A crop area in fractions of the image (0..1), so it survives any display size. */
export type CropAreaType = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const FULL_CROP_AREA: Readonly<CropAreaType> = { x: 0, y: 0, width: 1, height: 1 };

/** Phone photos are 12+ MP; the model looks at 224 px, so anything above this only costs memory. */
const MAX_IMAGE_SIDE = 1280;

export const MIN_CROP_SIZE = 0.1;

/** A corner moves two edges, a side moves one. */
export const CROP_HANDLES = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
] as const;

export type CropHandleType = (typeof CROP_HANDLES)[number];

/**
 * Moves only the edges the handle holds, by `dx`/`dy` in fractions of the image, and keeps the others in place.
 * Edges stop at the image border and never come closer to the opposite edge than `MIN_CROP_SIZE`.
 */
export function resizeCropArea(area: CropAreaType, handle: CropHandleType, dx: number, dy: number): CropAreaType {
  const edges = new Set(handle.split("-"));
  let left = area.x;
  let top = area.y;
  let right = area.x + area.width;
  let bottom = area.y + area.height;

  if (edges.has("left")) {
    left = Math.min(Math.max(0, left + dx), right - MIN_CROP_SIZE);
  }

  if (edges.has("right")) {
    right = Math.max(Math.min(1, right + dx), left + MIN_CROP_SIZE);
  }

  if (edges.has("top")) {
    top = Math.min(Math.max(0, top + dy), bottom - MIN_CROP_SIZE);
  }

  if (edges.has("bottom")) {
    bottom = Math.max(Math.min(1, bottom + dy), top + MIN_CROP_SIZE);
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Decodes the file with its EXIF orientation applied and scales it down to a size the device handles quickly. */
export async function loadImageBitmap(file: Blob): Promise<ImageBitmap> {
  const original = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(original.width, original.height));

  if (scale === 1) {
    return original;
  }

  const resized = await createImageBitmap(original, {
    resizeWidth: Math.round(original.width * scale),
    resizeHeight: Math.round(original.height * scale),
    resizeQuality: "high",
  });

  original.close();

  return resized;
}

export function cropImage(image: ImageBitmap, area: CropAreaType): HTMLCanvasElement {
  const sourceX = Math.round(area.x * image.width);
  const sourceY = Math.round(area.y * image.height);
  const width = Math.max(1, Math.round(area.width * image.width));
  const height = Math.max(1, Math.round(area.height * image.height));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height);

  return canvas;
}

export function clampCropArea(area: CropAreaType): CropAreaType {
  const width = Math.min(1, Math.max(MIN_CROP_SIZE, area.width));
  const height = Math.min(1, Math.max(MIN_CROP_SIZE, area.height));

  return {
    x: Math.min(1 - width, Math.max(0, area.x)),
    y: Math.min(1 - height, Math.max(0, area.y)),
    width,
    height,
  };
}

export function isFullCropArea(area: CropAreaType): boolean {
  return area.x === 0 && area.y === 0 && area.width === 1 && area.height === 1;
}
