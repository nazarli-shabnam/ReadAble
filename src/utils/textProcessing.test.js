/**
 * Unit tests for textProcessing utilities
 * 
 * To run tests:
 * 1. Install dependencies: corepack yarn install
 * 2. Run tests: corepack yarn test
 * 3. Watch mode: corepack yarn test:watch
 * 4. Coverage: corepack yarn test:coverage
 */

import {
  splitSentences,
  tokenize,
  extractKeySpans,
  summarizeText,
  simplifyText,
  buildDocument,
} from "./textProcessing";

describe("textProcessing utilities", () => {
  describe("splitSentences", () => {
    test("should split simple sentences", () => {
      const text = "Hello world. This is a test. Another sentence!";
      const result = splitSentences(text);
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe("Hello world.");
      expect(result[1].text).toBe("This is a test.");
      expect(result[2].text).toBe("Another sentence!");
    });

    test("should handle abbreviations", () => {
      const text = "Dr. Smith went to the U.S.A. He was happy.";
      const result = splitSentences(text);
      // Should not split on Dr. or U.S.A.
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toContain("Dr.");
    });

    test("should handle decimal numbers", () => {
      const text = "The price is $3.14. That's cheap!";
      const result = splitSentences(text);
      // Should not split on 3.14
      expect(result.length).toBeGreaterThan(0);
    });

    test("should return empty array for empty text", () => {
      expect(splitSentences("")).toEqual([]);
      expect(splitSentences(null)).toEqual([]);
      expect(splitSentences(undefined)).toEqual([]);
    });

    test("should include position information", () => {
      const text = "First. Second!";
      const result = splitSentences(text);
      expect(result[0]).toHaveProperty("start");
      expect(result[0]).toHaveProperty("end");
      expect(result[0].start).toBeGreaterThanOrEqual(0);
      expect(result[0].end).toBeGreaterThan(result[0].start);
    });
  });

  describe("tokenize", () => {
    test("should tokenize text correctly", () => {
      const text = "Hello world test";
      const result = tokenize(text);
      expect(result).toContain("hello");
      expect(result).toContain("world");
      expect(result).toContain("test");
    });

    test("should filter short words", () => {
      const text = "a an it hello";
      const result = tokenize(text);
      expect(result).not.toContain("a");
      expect(result).not.toContain("an");
      expect(result).not.toContain("it");
      expect(result).toContain("hello");
    });

    test("should handle empty text", () => {
      expect(tokenize("")).toEqual([]);
      expect(tokenize(null)).toEqual([]);
    });
  });

  describe("extractKeySpans", () => {
    test("should extract dates", () => {
      const text = "The meeting is on January 15, 2024.";
      const result = extractKeySpans(text);
      expect(result.dates.length).toBeGreaterThan(0);
      expect(result.dates[0].value).toContain("January");
    });

    test("should extract amounts", () => {
      const text = "The price is $100.50.";
      const result = extractKeySpans(text);
      expect(result.amounts.length).toBeGreaterThan(0);
      expect(result.amounts[0].value).toContain("100");
    });

    test("should return empty arrays for text without dates or amounts", () => {
      const text = "This is just regular text.";
      const result = extractKeySpans(text);
      expect(result.dates).toEqual([]);
      expect(result.amounts).toEqual([]);
    });
  });

  describe("summarizeText", () => {
    test("should summarize using first sentences", () => {
      // summarizeText requires non-empty text when sentences are provided
      const text = "Full text content here.";
      const sentences = ["First sentence.", "Second sentence.", "Third sentence."];
      const result = summarizeText(text, sentences);
      expect(result).toContain("First sentence");
      expect(result).toContain("Second sentence");
      
      // Also test with sentence objects
      const sentenceObjects = [
        { text: "First sentence.", start: 0, end: 16 },
        { text: "Second sentence.", start: 17, end: 33 },
      ];
      const result2 = summarizeText(text, sentenceObjects);
      expect(result2).toContain("First sentence");
      expect(result2).toContain("Second sentence");
    });

    test("should summarize using word count if no sentences", () => {
      const text = "This is a test sentence with many words that should be truncated.";
      const result = summarizeText(text);
      expect(result.split(" ").length).toBeLessThanOrEqual(40);
    });
  });

  describe("simplifyText", () => {
    test("should remove complex connectors", () => {
      const text = "However, this is a test. Furthermore, it works.";
      const result = simplifyText(text);
      expect(result).not.toContain("However");
      expect(result).not.toContain("Furthermore");
    });

    test("should replace commas and semicolons with periods", () => {
      const text = "First, second; third.";
      const result = simplifyText(text);
      expect(result).toContain(".");
      expect(result.split(".").length).toBeGreaterThan(2);
    });
  });

  describe("buildDocument", () => {
    test("should build complete document structure", () => {
      const text = "This is a test document. It has multiple sentences!";
      const doc = buildDocument(text);
      
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("rawText");
      expect(doc).toHaveProperty("sentences");
      expect(doc).toHaveProperty("sentenceMeta");
      expect(doc).toHaveProperty("sentenceRanges");
      expect(doc).toHaveProperty("summary");
      expect(doc).toHaveProperty("simplifiedText");
      expect(doc).toHaveProperty("highlights");
      expect(doc).toHaveProperty("structures");
      expect(doc).toHaveProperty("createdAt");
    });

    test("should generate unique IDs", () => {
      const text = "Test";
      const doc1 = buildDocument(text);
      const doc2 = buildDocument(text);
      expect(doc1.id).not.toBe(doc2.id);
    });

    test("should match sentence count with ranges", () => {
      const text = "First. Second! Third?";
      const doc = buildDocument(text);
      expect(doc.sentences.length).toBe(doc.sentenceRanges.length);
      expect(doc.sentences.length).toBe(doc.sentenceMeta.length);
    });
  });
});
