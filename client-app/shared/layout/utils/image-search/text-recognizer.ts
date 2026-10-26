import languageDataUrl from "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url";
import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";
import { extractSearchTerms } from "./text-terms";
import type { Worker } from "tesseract.js";

/**
 * Tesseract reads the brand, model and product name printed on the item or its box, on the device, in a Web
 * Worker, so it runs alongside the image model. Everything is served with the storefront: the worker, the SIMD
 * LSTM core (wasm inlined, ~4 MB) and the English data (~3 MB), which covers Latin brand and model names.
 */
const OCR_LANGUAGE = "eng";
const OEM_LSTM_ONLY = 1;

let workerPromise: Promise<Worker> | undefined;

/**
 * tesseract.js asks for `<langPath>/eng.traineddata.gz`; the build keeps that file name (`vite.config.ts`), so the
 * folder of the bundled file is the language path. Absolute, because the worker resolves it from its own URL.
 */
function getLanguagePath(): string {
  return new URL(".", new URL(languageDataUrl, window.location.href)).href;
}

/** One worker per page: the language data is downloaded and initialised once. */
export function loadTextRecognizer(): Promise<Worker> {
  workerPromise ??= import("tesseract.js")
    .then(({ createWorker }) =>
      createWorker(OCR_LANGUAGE, OEM_LSTM_ONLY, {
        workerPath,
        corePath,
        langPath: getLanguagePath(),
        workerBlobURL: false,
      }),
    )
    .catch((error: unknown) => {
      workerPromise = undefined;
      throw error;
    });

  return workerPromise;
}

/** Search terms printed on the photo (the cropped part), best first; empty when there is no readable text. */
export async function readTextTerms(image: HTMLCanvasElement): Promise<string[]> {
  const worker = await loadTextRecognizer();
  const { data } = await worker.recognize(image, {}, { blocks: true });

  const words = (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
  );

  return extractSearchTerms(words);
}
