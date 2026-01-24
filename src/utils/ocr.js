import { warn } from "./logger";

let recognizer;
try {
  recognizer = require("@react-native-ml-kit/text-recognition").default;
} catch (err) {
  recognizer = null;
}

const normalizeBlocks = (blocks = []) => {
  return blocks.map((block) => ({
    text: block.text,
    boundingBox: block.bounding,
    lines: block.lines?.map((line) => ({
      text: line.text,
      boundingBox: line.bounding,
    })),
  }));
};

const isValidUri = (uri) => {
  if (!uri || typeof uri !== "string") return false;
  // Check for common URI patterns: file://, content://, http://, https://, or data:
  return /^(file|content|http|https|data):/.test(uri) || uri.startsWith("/");
};

export const runOcrFromImage = async (image) => {
  if (!image?.uri) {
    return {
      text: "",
      blocks: [],
      meta: {
        provider: "error",
        error: "No image URI provided",
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (!isValidUri(image.uri)) {
    warn("Invalid image URI format:", image.uri);
    return {
      text: "",
      blocks: [],
      meta: {
        sourceUri: image.uri,
        provider: "error",
        error: "Invalid image URI format",
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (recognizer?.recognize) {
    try {
      const result = await recognizer.recognize(image.uri);
      const blocks = normalizeBlocks(result?.blocks || []);
      const text = blocks.map((b) => b.text).join("\n");
      return {
        text,
        blocks,
        meta: {
          sourceUri: image.uri,
          provider: "mlkit",
          createdAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      warn("OCR failed, falling back to stub:", err);
    }
  }

  const placeholderText =
    "OCR unavailable: install a Dev Client with ML Kit / Apple Vision and reopen the image.";

  return {
    text: placeholderText,
    blocks: [],
    meta: {
      sourceUri: image.uri,
      provider: "stub",
      createdAt: new Date().toISOString(),
    },
  };
};
