import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { loadSettings, normalizeSettings, saveSettings } from "../utils/storage";

/**
 * Persisted reading preferences.
 * @returns {[typeof DEFAULT_SETTINGS, (changes: object) => void, boolean]}
 *   settings, an updater that merges, validates and saves changes, and whether
 *   the saved settings have been loaded yet (render the UI only once they are,
 *   so nobody sees the defaults flash by)
 */
export const useSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const loadedRef = useRef(false);
  // Changes made before the stored settings arrived; applied on top of them.
  const earlyChangesRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((stored) => {
      if (cancelled) return;
      const next = normalizeSettings({ ...stored, ...earlyChangesRef.current });
      if (Object.keys(earlyChangesRef.current).length) saveSettings(next);
      settingsRef.current = next;
      loadedRef.current = true;
      setSettings(next);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((changes) => {
    if (!loadedRef.current) {
      earlyChangesRef.current = { ...earlyChangesRef.current, ...changes };
      return;
    }
    const next = normalizeSettings({ ...settingsRef.current, ...changes });
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);

  return [settings, update, loaded];
};
