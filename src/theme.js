import { createContext, useContext } from "react";

// Soft tinted paper and slate ink rather than pure white/black: easier on the
// eyes for many dyslexic readers. High contrast is the exception on purpose.
const light = {
  name: "light",
  page: "#EAF0EC",
  surface: "#FAFCFA",
  field: "#F0F4F1",
  ink: "#1E2A32",
  inkMuted: "#52616B",
  border: "#CBD6CF",
  borderWidth: 1,
  accent: "#1F5E66",
  onAccent: "#FFFFFF",
  selected: "#D5E8E6",
  onSelected: "#123A3F",
  danger: "#9E3A2B",
  dangerSoft: "#F6E3DF",
  disabled: "#B7C2BC",
  onDisabled: "#5E6B72",
  reading: "#D4E8FF",
  date: "#FFF0C2",
  onDate: "#5A4410",
  amount: "#D3F2E2",
  onAmount: "#0E4D31",
  switchTrack: "#B7C2BC",
  focus: "#1F5E66",
};

const highContrast = {
  name: "highContrast",
  page: "#FFFFFF",
  surface: "#FFFFFF",
  field: "#FFFFFF",
  ink: "#000000",
  inkMuted: "#000000",
  border: "#000000",
  borderWidth: 2,
  accent: "#000000",
  onAccent: "#FFFFFF",
  selected: "#FFE600",
  onSelected: "#000000",
  danger: "#B00000",
  dangerSoft: "#FFFFFF",
  disabled: "#767676",
  onDisabled: "#595959",
  reading: "#00E5FF",
  date: "#FFE600",
  onDate: "#000000",
  amount: "#7CFF7C",
  onAmount: "#000000",
  switchTrack: "#595959",
  focus: "#0047FF",
};

export const THEMES = { light, highContrast };

// Font faces per reading font; `undefined` means the platform default.
export const FONT_FACES = {
  atkinson: {
    label: "Atkinson",
    regular: "AtkinsonHyperlegible_400Regular",
    bold: "AtkinsonHyperlegible_700Bold",
  },
  lexend: { label: "Lexend", regular: "Lexend_400Regular", bold: "Lexend_700Bold" },
  system: { label: "System", regular: undefined, bold: undefined },
};

// Interface text always uses Atkinson; the reading font only affects the reader.
export const UI_FONT = FONT_FACES.atkinson;

export const ThemeContext = createContext(light);
export const useTheme = () => useContext(ThemeContext);

/** "#rrggbb" + opacity → "rgba(...)". */
export const withOpacity = (hex, opacity) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
};
