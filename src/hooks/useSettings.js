import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { loadSettings, normalizeSettings, saveSettings } from "../utils/storage";

/**
 * Persisted reading preferences.
 * @returns {[typeof DEFAULT_SETTINGS, (changes: object) => void]}
 *   settings, and an updater that merges, validates and saves changes
 */
export const useSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const touchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      // Don't let a slow load overwrite a change the user already made.
      if (cancelled || touchedRef.current) return;
      settingsRef.current = stored;
      setSettings(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((changes) => {
    touchedRef.current = true;
    const next = normalizeSettings({ ...settingsRef.current, ...changes });
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  return [settings, update];
};
