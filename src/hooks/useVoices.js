import { useEffect, useState } from "react";
import * as Speech from "expo-speech";
import { warn } from "../utils/logger";

/** English voices installed on this device, by name (the app reads English text). */
export const pickVoices = (voices) =>
  (voices || [])
    .filter((v) => v?.identifier && /^en([-_]|$)/i.test(v.language || ""))
    .sort((a, b) => (a.name || a.identifier).localeCompare(b.name || b.identifier));

/** The speech voices the reader can choose from; empty until loaded or if there are none. */
export const useVoices = () => {
  const [voices, setVoices] = useState([]);
  useEffect(() => {
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then((all) => {
        if (!cancelled) setVoices(pickVoices(all));
      })
      .catch((err) => warn("Could not list speech voices:", err));
    return () => {
      cancelled = true;
    };
  }, []);
  return voices;
};
