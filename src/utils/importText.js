import * as DocumentPicker from "expo-document-picker";
import { warn } from "./logger";

// A plain text file this big is already far more than anyone reads in the app.
export const MAX_IMPORT_BYTES = 1024 * 1024;

/**
 * Lets the reader pick a plain text (.txt / .md) file and returns its text.
 * @returns {Promise<{status: "ok", text: string} | {status: "canceled"|"empty"|"tooLarge"|"error"}>}
 */
export const pickTextFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "text/markdown"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return { status: "canceled" };
    const asset = result.assets?.[0];
    if (!asset?.uri) return { status: "error" };
    if (asset.size > MAX_IMPORT_BYTES) return { status: "tooLarge" };

    const text = (await (await fetch(asset.uri)).text()).trim();
    if (text.length > MAX_IMPORT_BYTES) return { status: "tooLarge" };
    return text ? { status: "ok", text } : { status: "empty" };
  } catch (err) {
    warn("Could not read the file:", err);
    return { status: "error" };
  }
};
