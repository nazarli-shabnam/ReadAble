// Reading preferences: defaults, allowed ranges and choices.
// Used by the settings UI and to validate whatever is read back from storage.

export const DEFAULT_SETTINGS = {
  highContrast: false,
  fontFamily: "atkinson",
  fontSize: 18,
  lineSpacing: 1.5, // multiple of the font size
  letterSpacing: 0.2,
  overlayEnabled: false,
  overlayColor: "#fef3c7",
  overlayOpacity: 0.4,
  focusMode: false,
  ttsRate: 1,
  viewMode: "simplified", // which version of the text the reader shows
  voice: "", // identifier of the chosen speech voice; empty = the device default
};

export const SETTING_LIMITS = {
  fontSize: { min: 14, max: 32, step: 1 },
  lineSpacing: { min: 1.2, max: 2.5, step: 0.1 },
  letterSpacing: { min: 0, max: 2, step: 0.2 },
  overlayOpacity: { min: 0.1, max: 1, step: 0.1 },
  ttsRate: { min: 0.5, max: 2, step: 0.1 },
};

// Clamp into range and snap to the step grid (2 decimals avoids 0.30000000000000004).
export const clampToStep = (value, { min, max, step }) => {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round((min + Math.round((clamped - min) / step) * step) * 100) / 100;
};

export const OVERLAY_COLORS = [
  { value: "#fef3c7", label: "Cream" },
  { value: "#e0f2fe", label: "Blue" },
  { value: "#f5f3ff", label: "Lilac" },
  { value: "#dcfce7", label: "Green" },
  { value: "#ffe4e6", label: "Rose" },
];

export const VIEW_MODE_IDS = ["simplified", "original"];
export const FONT_FAMILY_IDS = ["atkinson", "lexend", "system"];
