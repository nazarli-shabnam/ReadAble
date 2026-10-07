import { OVERLAY_COLORS } from "./constants/settings";
import { THEMES } from "./theme";

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (fg, opacity, bg) =>
  `#${channels(fg)
    .map((v, i) => Math.round(v * opacity + channels(bg)[i] * (1 - opacity)).toString(16).padStart(2, "0"))
    .join("")}`;

const light = THEMES.light;
// The reader page: plain field colour, or any tint at any strength the settings allow.
const pages = [
  light.field,
  ...OVERLAY_COLORS.flatMap((c) => [0.1, 0.4, 1].map((o) => mix(c.value, o, light.field))),
];

test.each([
  ["reading", "ink"],
  ["date", "onDate"],
  ["amount", "onAmount"],
])("the %s mark stays visible on every reading tint and keeps readable text", (mark, text) => {
  pages.forEach((page) => expect(contrast(light[mark], page)).toBeGreaterThanOrEqual(1.3));
  expect(contrast(light[mark], light[text])).toBeGreaterThanOrEqual(4.5);
});
