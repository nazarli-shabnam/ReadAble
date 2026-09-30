import Constants, { ExecutionEnvironment } from "expo-constants";
import { warn } from "./logger";
import { cleanOcrText } from "./ocrText";

let recognizer;
try {
  recognizer = require("@react-native-ml-kit/text-recognition").default;
} catch {
  recognizer = null;
}

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const OCR_UNAVAILABLE_MESSAGE = isExpoGo
  ? "Reading text from photos isn't available in Expo Go. Build the app with `npx expo run:android` or `npx expo run:ios` to use it, or type or paste the text instead."
  : "Reading text from photos isn't available on this device. Type or paste the text instead.";

/**
 * Recognises text in an image with ML Kit (Android) / Apple Vision (iOS).
 * @returns {Promise<{status: "ok"|"empty"|"unavailable"|"error", text: string}>}
 */
export const runOcrFromImage = async (image) => {
  if (!image?.uri) return { status: "error", text: "" };
  if (!recognizer?.recognize) return { status: "unavailable", text: "" };

  try {
    const result = await recognizer.recognize(image.uri);
    const text = cleanOcrText(
      (result?.blocks || []).map((b) => (b?.text == null ? "" : String(b.text)))
    );
    return { status: text ? "ok" : "empty", text };
  } catch (err) {
    // A missing native module (e.g. Expo Go) throws here.
    warn("OCR failed:", err);
    return { status: isExpoGo ? "unavailable" : "error", text: "" };
  }
};
