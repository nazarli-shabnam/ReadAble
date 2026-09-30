import { runOcrFromImage } from "./ocr";

// Same access path as ocr.js (the jest.setup mock has no __esModule flag).
const TextRecognition = require("@react-native-ml-kit/text-recognition").default;

test("tolerates null, missing and non-string block text", async () => {
  TextRecognition.recognize.mockResolvedValueOnce({
    blocks: [{ text: "Pay by\nFriday." }, null, {}, { text: 42 }],
  });
  expect(await runOcrFromImage({ uri: "file:///x.png" })).toEqual({
    status: "ok",
    text: "Pay by Friday.\n\n42",
  });
});
