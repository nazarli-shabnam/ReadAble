import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";

/**
 * Opens the share sheet; where there is none (web without navigator.share) the
 * text goes to the clipboard instead.
 * @returns {Promise<"shared"|"dismissed"|"copied">}
 */
export const shareOrCopy = async (message) => {
  try {
    await Share.share({ message });
    return "shared";
  } catch (err) {
    // Closing the web share sheet rejects with an AbortError: not a failure.
    if (err?.name === "AbortError") return "dismissed";
    await Clipboard.setStringAsync(message);
    return "copied";
  }
};
