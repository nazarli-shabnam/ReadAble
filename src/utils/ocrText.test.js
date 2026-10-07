import { appendScan, cleanOcrText } from "./ocrText";

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

test("keeps headings, label lines and address lines on their own lines", () => {
  expect(cleanOcrText(["INVOICE\nTotal due: $50\nDue date: March 5, 2026"])).toBe(
    "INVOICE\nTotal due: $50\nDue date: March 5, 2026"
  );
  expect(cleanOcrText(["John Smith\n12 Main Street\nBoston, MA 02101"])).toBe(
    "John Smith\n12 Main Street\nBoston, MA 02101"
  );
});

test("still joins wrapped prose that ends on a function word", () => {
  expect(cleanOcrText(["Please send the form to\nJohn Smith before the end of\nthe month."])).toBe(
    "Please send the form to John Smith before the end of the month."
  );
});

test("collapses repeated spaces and handles empty input", () => {
  expect(cleanOcrText(["Too    many   spaces"])).toBe("Too many spaces");
  expect(cleanOcrText([])).toBe("");
  expect(cleanOcrText([null])).toBe("");
});

test("a scan is added below the existing text instead of replacing it", () => {
  expect(appendScan("Page one.  \n", "Page two.")).toBe("Page one.\n\nPage two.");
  expect(appendScan("", "Page one.")).toBe("Page one.");
  expect(appendScan("  \n ", "Page one.")).toBe("Page one.");
});
