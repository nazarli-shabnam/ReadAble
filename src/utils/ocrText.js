import { keepsLineBreak } from "./textProcessing";

const LIST_ITEM = /^(?:[-*•]|\d+[.)])\s/;

/**
 * Turns raw OCR block text into readable prose: rejoins words hyphenated at
 * line ends, joins wrapped lines, and separates blocks with a blank line.
 * Lines that look like list items, headings or "Label: value" lines keep
 * their own line.
 */
export const cleanOcrText = (blocks) =>
  blocks
    .map((block) => {
      const lines = (block || "")
        .replace(/(\w)-\n(\w)/g, "$1$2")
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .filter(Boolean);
      return lines
        .reduce((out, line, i) => {
          if (i === 0) return line;
          const sep = LIST_ITEM.test(line) || keepsLineBreak(lines[i - 1], line) ? "\n" : " ";
          return `${out}${sep}${line}`;
        }, "")
        .trim();
    })
    .filter(Boolean)
    .join("\n\n");
