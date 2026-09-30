/**
 * Turns raw OCR block text into readable prose: rejoins words hyphenated at
 * line ends, joins wrapped lines, and separates blocks with a blank line.
 * Lines that look like list items keep their own line.
 */
export const cleanOcrText = (blocks) =>
  blocks
    .map((block) =>
      (block || "")
        .replace(/(\w)-\n(\w)/g, "$1$2")
        .replace(/\n(?!\s*(?:[-*•]|\d+[.)])\s)/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
