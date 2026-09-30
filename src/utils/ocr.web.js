// Web OCR with tesseract.js (Metro picks this file instead of ocr.js on web).
// The first scan downloads the OCR engine and English data (~10 MB) from a
// CDN; the browser caches them after that. The image never leaves the device.
import { warn } from "./logger";
import { cleanOcrText } from "./ocrText";

export const OCR_UNAVAILABLE_MESSAGE =
  "Text scanning couldn't start in this browser. Check your internet connection for the first scan, or type or paste the text instead.";

// Tesseract's own 0-100 score; below this the result is mostly noise.
const MIN_CONFIDENCE = 30;

let workerPromise = null;
// One worker, created on first use and reused for later scans.
const getWorker = () => {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) => createWorker("eng"))
      .catch((err) => {
        workerPromise = null; // allow a retry later
        throw err;
      });
  }
  return workerPromise;
};

/**
 * @returns {Promise<{status: "ok"|"empty"|"unavailable"|"error", text: string}>}
 */
export const runOcrFromImage = async (image) => {
  if (!image?.uri) return { status: "error", text: "" };

  let worker;
  try {
    worker = await getWorker();
  } catch (err) {
    warn("Could not start OCR:", err);
    return { status: "unavailable", text: "" };
  }

  try {
    const { data } = await worker.recognize(image.uri);
    if (data.confidence < MIN_CONFIDENCE) return { status: "empty", text: "" };
    // Tesseract separates paragraphs with blank lines.
    const text = cleanOcrText(data.text.split(/\n\s*\n/));
    return { status: text ? "ok" : "empty", text };
  } catch (err) {
    warn("OCR failed:", err);
    return { status: "error", text: "" };
  }
};
