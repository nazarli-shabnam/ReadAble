import { cleanOcrText } from "./ocrText";

test("joins wrapped lines and rejoins hyphenated words", () => {
  expect(cleanOcrText(["The library will close for main-\ntenance on\nMarch 12, 2025."])).toBe(
    "The library will close for maintenance on March 12, 2025."
  );
});

test("keeps list items on their own lines and separates blocks", () => {
  expect(cleanOcrText(["Bring:\n- a pen\n- your card", "  ", "Thanks!"])).toBe(
    "Bring:\n- a pen\n- your card\n\nThanks!"
  );
});

test("collapses repeated spaces and handles empty input", () => {
  expect(cleanOcrText(["Too    many   spaces"])).toBe("Too many spaces");
  expect(cleanOcrText([])).toBe("");
  expect(cleanOcrText([null])).toBe("");
});
