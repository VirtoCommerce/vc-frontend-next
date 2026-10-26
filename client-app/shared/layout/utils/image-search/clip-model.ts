import type {
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  PreTrainedTokenizer,
  Processor,
  RawImage,
} from "@huggingface/transformers";

/**
 * MobileCLIP S0 puts photos and text into one vector space, so a photo can be compared both with the store's
 * category names and with its product photos. Smallest working weights: the int8 image encoder scores at random,
 * so it runs in fp16 (~23 MB); the text encoder keeps int8 (~43 MB). The browser caches both after the first use.
 */
const MODEL_ID = "Xenova/mobileclip_s0";
const VISION_DTYPE = "fp16";
const TEXT_DTYPE = "q8";

type ClipModelType = {
  RawImage: typeof RawImage;
  tokenizer: PreTrainedTokenizer;
  processor: Processor;
  vision: CLIPVisionModelWithProjection;
  text: CLIPTextModelWithProjection;
};

/** Download progress of all model files together, 0..100. */
export type ModelProgressHandlerType = (percent: number) => void;

let modelPromise: Promise<ClipModelType> | undefined;
const progressHandlers = new Set<ModelProgressHandlerType>();

function trackProgress(): (event: { status: string; file?: string; loaded?: number; total?: number }) => void {
  const files = new Map<string, { loaded: number; total: number }>();

  return (event) => {
    if (event.status !== "progress" || !event.file || !event.total) {
      return;
    }

    files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });

    const loaded = [...files.values()].reduce((sum, file) => sum + file.loaded, 0);
    const total = [...files.values()].reduce((sum, file) => sum + file.total, 0);
    const percent = Math.round((loaded / total) * 100);

    progressHandlers.forEach((handler) => handler(percent));
  };
}

async function createModel(): Promise<ClipModelType> {
  // Imported here, not at the top: the ~1.8 MB runtime loads only when a shopper opens the image search.
  const transformers = await import("@huggingface/transformers");
  const progress_callback = trackProgress();

  const [tokenizer, processor, vision, text] = await Promise.all([
    transformers.AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback }),
    transformers.AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
    transformers.CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: VISION_DTYPE, progress_callback }),
    transformers.CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { dtype: TEXT_DTYPE, progress_callback }),
  ]);

  return { RawImage: transformers.RawImage, tokenizer, processor, vision, text };
}

/** One model per page: downloaded and compiled once, then reused for every photo, crop and catalog image. */
export function loadClipModel(onProgress?: ModelProgressHandlerType): Promise<ClipModelType> {
  if (onProgress) {
    progressHandlers.add(onProgress);
  }

  modelPromise ??= createModel().catch((error: unknown) => {
    modelPromise = undefined;
    throw error;
  });

  return modelPromise;
}

export function removeModelProgressHandler(handler: ModelProgressHandlerType): void {
  progressHandlers.delete(handler);
}

/** L2-normalised image vector of a canvas (the cropped photo) or a blob (a catalog image). */
export async function embedImage(source: HTMLCanvasElement | Blob): Promise<Float32Array> {
  const model = await loadClipModel();
  const image = source instanceof Blob ? await model.RawImage.fromBlob(source) : model.RawImage.fromCanvas(source);
  const { image_embeds } = await model.vision(await model.processor(image));

  return image_embeds.normalize(2, -1).data as Float32Array;
}

/** L2-normalised text vectors, one per text, in the same space as `embedImage`. */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const model = await loadClipModel();
  // The text encoder is exported for a fixed context of 77 tokens.
  const inputs = model.tokenizer(texts, { padding: "max_length", truncation: true });
  const { text_embeds } = await model.text(inputs);
  const normalized = text_embeds.normalize(2, -1);
  const [count, size] = normalized.dims;
  const data = normalized.data as Float32Array;

  return Array.from({ length: count }, (_, index) => data.slice(index * size, (index + 1) * size));
}
