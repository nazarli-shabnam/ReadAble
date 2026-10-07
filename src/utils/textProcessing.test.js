import {
  splitSentences,
  tokenize,
  findKeySpans,
  extractKeySpans,
  summarizeText,
  simplifyText,
  answerQuestion,
  buildDocument,
} from "./textProcessing";
import { SAMPLE_TEXT } from "../constants/sampleText";

const texts = (sentences) => sentences.map((s) => s.text);

describe("splitSentences", () => {
  it("starts a new sentence at heading and label lines", () => {
    const parts = splitSentences("INVOICE\nTotal due: $50\nDue date: March 5, 2026").map((x) => x.text);
    expect(parts).toEqual(["INVOICE", "Total due: $50", "Due date: March 5, 2026"]);
    expect(splitSentences("The library will\nclose on Monday.")).toHaveLength(1);
  });

  test("splits simple sentences", () => {
    expect(texts(splitSentences("Hello world. This is a test. Another sentence!"))).toEqual([
      "Hello world.",
      "This is a test.",
      "Another sentence!",
    ]);
  });

  test("does not split after titles, initials or acronyms", () => {
    expect(texts(splitSentences("Dr. Smith met J. K. Rowling. They talked."))).toEqual([
      "Dr. Smith met J. K. Rowling.",
      "They talked.",
    ]);
    expect(splitSentences("He lives in the U.S.A. now.")).toHaveLength(1);
  });

  test("splits after am/pm and etc. at the end of a sentence", () => {
    expect(texts(splitSentences("Doors open at 6:00 PM. Bring a pen, paper, etc. Be early."))).toEqual([
      "Doors open at 6:00 PM.",
      "Bring a pen, paper, etc.",
      "Be early.",
    ]);
  });

  test("splits after a.m./p.m. at the end of a sentence", () => {
    expect(texts(splitSentences("Doors open at 7 p.m. Be early."))).toEqual([
      "Doors open at 7 p.m.",
      "Be early.",
    ]);
    expect(splitSentences("Open 9 a.m. Monday to Friday.")).toHaveLength(2);
  });

  test("keeps numbering abbreviations with their number", () => {
    expect(splitSentences("See No. 5 on the list.")).toHaveLength(1);
  });

  test("does not split decimals or emails", () => {
    expect(texts(splitSentences("The price is $3.14. Email a@b.com today."))).toEqual([
      "The price is $3.14.",
      "Email a@b.com today.",
    ]);
  });

  test("handles closing quotes and ? / !", () => {
    expect(texts(splitSentences('He said "Stop!" Then he left. No? Yes.'))).toEqual([
      'He said "Stop!"',
      "Then he left.",
      "No?",
      "Yes.",
    ]);
  });

  test("blank lines and bullet lines start new sentences", () => {
    expect(texts(splitSentences("Reminder\n\nThe library closes\n- item one\n- item two"))).toEqual([
      "Reminder",
      "The library closes",
      "- item one",
      "- item two",
    ]);
  });

  test("positions map back to the original text", () => {
    const text = "  First one.   Second one!\nThird.";
    splitSentences(text).forEach((s) => {
      expect(text.slice(s.start, s.end)).toBe(s.text);
    });
  });

  test("returns [] for empty input", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   ")).toEqual([]);
    expect(splitSentences(null)).toEqual([]);
    expect(splitSentences(undefined)).toEqual([]);
  });
});

describe("tokenize", () => {
  test("lowercases, drops short words, stems plurals", () => {
    expect(tokenize("Late FEES and dates apply to a policy")).toEqual([
      "late",
      "fee",
      "and",
      "date",
      "apply",
      "policy",
    ]);
    expect(tokenize("libraries boxes class")).toEqual(["library", "box", "class"]);
  });

  test("handles empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe("findKeySpans", () => {
  const values = (text) => findKeySpans(text).map((s) => `${s.type}:${s.value}`);

  test("finds exactly the dates, times and amounts in the sample", () => {
    expect(values(SAMPLE_TEXT)).toEqual([
      "date:March 12, 2025",
      "date:6:00 PM",
      "amount:12$",
      "date:5:00 PM",
      "date:March 10, 2025",
    ]);
  });

  test("recognises common money formats", () => {
    expect(values("Pay $5, € 3.50, 1,000 USD, USD 20 or 10 dollars.")).toEqual([
      "amount:$5",
      "amount:€ 3.50",
      "amount:1,000 USD",
      "amount:USD 20",
      "amount:10 dollars",
    ]);
  });

  test("ignores plain numbers and bare month names", () => {
    expect(values("You may bring 3 friends in March. Room 12 is open.")).toEqual([]);
  });

  test("does not mark weights, version numbers or durations", () => {
    expect(values("The box weighs 10 pounds. Version 1.2.34 shipped. Run 1:30:45 long.")).toEqual([]);
    expect(values("It costs £5 or 5 GBP, 50 cents.")).toEqual([
      "amount:£5",
      "amount:5 GBP",
      "amount:50 cents",
    ]);
  });

  test("accepts only plausible numeric dates and times", () => {
    expect(values("On 12.03.2025 or 3-12-25 at 23:59.")).toEqual([
      "date:12.03.2025",
      "date:3-12-25",
      "date:23:59",
    ]);
    expect(values("Ratio 99/99/99 and 25:61.")).toEqual([]);
  });

  test("recognises common date formats", () => {
    expect(values("12 March 2025, Mar 2025, 2025-03-12, 12/03/2025, 5 pm, 7 p.m.")).toEqual([
      "date:12 March 2025",
      "date:Mar 2025",
      "date:2025-03-12",
      "date:12/03/2025",
      "date:5 pm",
      "date:7 p.m",
    ]);
  });

  test("spans index into the text", () => {
    findKeySpans(SAMPLE_TEXT).forEach((s) => {
      expect(SAMPLE_TEXT.slice(s.start, s.end)).toBe(s.value);
    });
  });
});

describe("extractKeySpans", () => {
  test("groups spans by type", () => {
    const result = extractKeySpans("The meeting is on January 15, 2024 and costs $100.50.");
    expect(result.dates).toEqual([{ value: "January 15, 2024", index: 18 }]);
    expect(result.amounts).toEqual([{ value: "$100.50", index: 45 }]);
  });

  test("returns empty arrays for text without key info", () => {
    expect(extractKeySpans("This is just regular text.")).toEqual({ dates: [], amounts: [] });
  });
});

describe("summarizeText", () => {
  test("returns short texts unchanged", () => {
    expect(summarizeText("One. Two.")).toBe("One. Two.");
  });

  test("picks the most central sentences and keeps their order", () => {
    const text = [
      "The library is closing for repairs.",
      "Pigeons like bread.",
      "The library repairs start on March 12, 2025.",
      "Weather was nice.",
      "Library books are due before the repairs.",
      "Cats sleep a lot.",
    ].join(" ");
    const summary = summarizeText(text);
    expect(summary).toBe(
      "The library is closing for repairs. The library repairs start on March 12, 2025. Library books are due before the repairs."
    );
  });

  test("accepts sentence objects", () => {
    expect(summarizeText("x", [{ text: "A b c." }, { text: "D e f." }])).toBe("A b c. D e f.");
  });
});

describe("simplifyText", () => {
  it("keeps heading and label lines apart without inventing periods", () => {
    expect(simplifyText("INVOICE\nTotal due: $50\nDue date: March 5, 2026")).toBe(
      "INVOICE\nTotal due: $50\nDue date: March 5, 2026"
    );
    expect(simplifyText("Terms\nPlease pay within 30 days of the invoice date.")).toBe(
      "Terms\nPlease pay within 30 days of the invoice date."
    );
  });

  it("does not split a list at its final \", and\"", () => {
    const list = "You need to bring a signed form, a valid passport, and the original receipt from the store.";
    expect(simplifyText(list)).toBe(list);
    expect(simplifyText("The fee is 1,000 dollars per year, and the deposit is due on arrival.")).toBe(
      "The fee is 1,000 dollars per year. The deposit is due on arrival."
    );
  });

  it("only removes connectives used as sentence openers", () => {
    expect(simplifyText("In addition, bring your ID.")).toBe("Bring your ID.");
    expect(simplifyText("In addition to the fee, you must bring your ID card.")).toBe(
      "In addition to the fee, you must bring your ID card."
    );
    expect(simplifyText("Thus far, we have received nothing.")).toBe("Thus far, we have received nothing.");
    expect(simplifyText("Also known as the Fee.")).toBe("Also known as the Fee.");
    expect(simplifyText("Also, bring a pen.")).toBe("Bring a pen.");
  });

  it("keeps a/an correct after a replacement", () => {
    expect(simplifyText("This requires an additional fee of $5.")).toBe("This needs an extra fee of $5.");
    expect(simplifyText("An additional fee applies.")).toBe("An extra fee applies.");
  });

  it("leaves words that are often nouns alone", () => {
    expect(simplifyText("Please make an attempt to call us.")).toBe("Please make an attempt to call us.");
    expect(simplifyText("Proof of purchase is needed.")).toBe("Proof of purchase is needed.");
  });

  it("replaces verb inflections consistently", () => {
    expect(simplifyText("We are utilizing the form.")).toBe("We are using the form.");
    expect(simplifyText("He obtained a permit.")).toBe("He got a permit.");
    expect(simplifyText("The plan initiates later.")).toBe("The plan starts later.");
  });

  test("never produces double periods and keeps dates and numbers intact", () => {
    const result = simplifyText(SAMPLE_TEXT);
    expect(result).not.toMatch(/\.\./);
    expect(result).toContain("March 12, 2025");
    expect(simplifyText("We paid 1,000 dollars.")).toBe("We paid 1,000 dollars.");
  });

  test("removes filler connectives", () => {
    expect(simplifyText("However, this is a test. Furthermore, it works.")).toBe(
      "This is a test. It works."
    );
    expect(simplifyText("The fee, however, is due.")).toBe("The fee is due.");
  });

  test("swaps hard words for plain ones, keeping case", () => {
    expect(simplifyText("Utilize the form prior to Monday in order to obtain assistance.")).toBe(
      "Use the form before Monday to get help."
    );
  });

  test("splits long sentences only where both parts are substantial", () => {
    expect(
      simplifyText(
        "You can return your books at the front desk; the staff will check them in for you."
      )
    ).toBe("You can return your books at the front desk. The staff will check them in for you.");
    expect(
      simplifyText("Students can request an extension by email, but they must do it before Friday.")
    ).toBe("Students can request an extension by email. But they must do it before Friday.");
    expect(simplifyText("Red, and blue.")).toBe("Red, and blue.");
  });

  test("keeps paragraph breaks (blank lines)", () => {
    expect(simplifyText("First part.\n\nSecond part")).toBe("First part.\n\nSecond part.");
  });

  test("joins hard-wrapped lines inside a paragraph", () => {
    expect(simplifyText("The library will\nclose on Monday.\nBring your card.")).toBe(
      "The library will close on Monday. Bring your card."
    );
  });

  test("keeps list items on their own lines", () => {
    const lines = simplifyText("Bring:\n- a pen\n- your card").split("\n");
    expect(lines).toHaveLength(3);
    expect(lines.slice(1)).toEqual(["- a pen.", "- your card."]);
  });

  test("handles empty input", () => {
    expect(simplifyText("")).toBe("");
  });
});

describe("answerQuestion", () => {
  const doc = buildDocument(SAMPLE_TEXT);

  test("finds the sentence about the due date", () => {
    const result = answerQuestion("When is the due date?", doc);
    expect(result.found).toBe(true);
    expect(result.answer).toMatch(/^Late book fees/);
    expect(result.source.sentenceIndex).toBe(1);
  });

  test("finds amounts for 'how much' questions", () => {
    const result = answerQuestion("How much are late fees?", doc);
    expect(result.answer).toMatch(/12\$/);
    expect(result.confidence).toBeGreaterThan(50);
  });

  test("answers date questions with the dated sentence", () => {
    expect(answerQuestion("When will the library close?", doc).answer).toMatch(/March 12/);
    expect(answerQuestion("When can I request an extension?", doc).answer).toMatch(/March 10/);
  });

  test("gives the same answer when asked twice (no regex state leaks)", () => {
    const first = answerQuestion("How much are late fees?", doc);
    const second = answerQuestion("How much are late fees?", doc);
    expect(second).toEqual(first);
  });

  test("reports not found for unrelated questions", () => {
    expect(answerQuestion("Who is the president of France?", doc).found).toBe(false);
    expect(answerQuestion("What?", doc).found).toBe(false);
    expect(answerQuestion("", doc).found).toBe(false);
  });
});

describe("buildDocument", () => {
  test("builds all derived fields", () => {
    const doc = buildDocument("This is a test document. It has multiple sentences!");
    expect(doc.sentences).toEqual(["This is a test document.", "It has multiple sentences!"]);
    expect(doc.sentenceMeta).toHaveLength(2);
    expect(doc.sentenceMeta[1].range).toEqual({ start: 25, end: 51 });
    expect(doc).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        rawText: expect.any(String),
        summary: expect.any(String),
        simplifiedText: expect.any(String),
        highlights: { dates: [], amounts: [] },
        createdAt: expect.any(String),
      })
    );
  });

  test("keeps a given id and createdAt", () => {
    const doc = buildDocument("Hi there.", { id: "abc", createdAt: "2025-01-01T00:00:00.000Z" });
    expect(doc.id).toBe("abc");
    expect(doc.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  test("generates unique ids", () => {
    expect(buildDocument("Test").id).not.toBe(buildDocument("Test").id);
  });
});
