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

export const runOcrFromImage = async (image) => {
  if (!image?.uri) {
    return { text: "", blocks: [] };
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
      console.warn("OCR failed, falling back to stub:", err);
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
