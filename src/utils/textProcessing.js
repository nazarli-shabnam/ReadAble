// Simple ID generator for React Native (no crypto dependency)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// ---------------------------------------------------------------------------
// Key span patterns (dates, times, money)
// ---------------------------------------------------------------------------

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?";
const DAY = "\\d{1,2}(?:st|nd|rd|th)?";
// "p.m" not "p.m." so a sentence-ending period is never swallowed.
const MERIDIEM = "(?:[ap]\\.m|[ap]m)";

// A bare month name ("may", "march") is not a date: it needs a day and/or year.
const DATE_SOURCE = [
  `${MONTH}\\s+${DAY}(?:,?\\s+\\d{4})?`, // March 12, 2025 / Mar 12
  `${DAY}\\s+(?:of\\s+)?${MONTH}(?:,?\\s+\\d{4})?`, // 12 March 2025
  `${MONTH},?\\s+\\d{4}`, // March 2025
  "\\d{4}-\\d{2}-\\d{2}", // 2025-03-12
  "\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}", // 12/03/2025
  `\\d{1,2}:\\d{2}(?:\\s?${MERIDIEM})?`, // 6:00 PM
  `\\d{1,2}\\s?${MERIDIEM}`, // 5 PM
].join("|");

const NUMBER = "(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?";
const CURRENCY_SYMBOL = "[$€£¥₹]";
const CURRENCY_WORD = "(?:USD|EUR|GBP|dollars?|euros?|pounds?|cents?)";

// Money requires a currency marker before or after the number.
const MONEY_SOURCE = [
  `${CURRENCY_SYMBOL}\\s?${NUMBER}`, // $5, € 3.50
  `\\b(?:USD|EUR|GBP)\\s?${NUMBER}`, // USD 20
  `\\b${NUMBER}\\s?(?:${CURRENCY_SYMBOL}|${CURRENCY_WORD}\\b)`, // 12$, 5 USD, 10 dollars
].join("|");

// The trailing (?![\w]) stops "March 20" matching inside "March 2025".
const datePattern = () => new RegExp(`\\b(?:${DATE_SOURCE})(?!\\w)`, "gi");
const moneyPattern = () => new RegExp(`(?:${MONEY_SOURCE})`, "gi");
// Non-global copies for .test(): global regexes keep lastIndex between calls.
const DATE_TEST = new RegExp(`\\b(?:${DATE_SOURCE})(?!\\w)`, "i");
const MONEY_TEST = new RegExp(`(?:${MONEY_SOURCE})`, "i");

/**
 * Finds date/time and money spans in text. Overlaps are resolved so the
 * earliest (then longest) span wins.
 * @returns {Array<{type: "date"|"amount", value: string, start: number, end: number}>}
 */
export const findKeySpans = (text) => {
  if (!text) return [];
  const collect = (pattern, type) =>
    [...text.matchAll(pattern)].map((m) => ({
      type,
      value: m[0],
      start: m.index,
      end: m.index + m[0].length,
    }));
  const all = [
    ...collect(datePattern(), "date"),
    ...collect(moneyPattern(), "amount"),
  ].sort((a, b) => a.start - b.start || b.end - a.end);

  const spans = [];
  for (const span of all) {
    const last = spans[spans.length - 1];
    if (!last || span.start >= last.end) spans.push(span);
  }
  return spans;
};

export const extractKeySpans = (text) => {
  const spans = findKeySpans(text);
  const pick = (type) =>
    spans
      .filter((s) => s.type === type)
      .map(({ value, start }) => ({ value, index: start }));
  return { dates: pick("date"), amounts: pick("amount") };
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

// Light plural stemming so "fees" matches "fee" and "dates" matches "date".
const stem = (word) => {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (/(?:s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
};

export const tokenize = (text) =>
  (text || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2)
    .map(stem);

const STOP_WORDS = new Set(
  (
    "the are was were what when where who whom whose how why which can could will would " +
    "should doe did does has have had for and but you your our this that these those there " +
    "with about from they them their its any all get please tell much many into than then " +
    "also just not yes been being able need"
  )
    .split(" ")
    .map(stem)
);

const contentTokens = (text) => tokenize(text).filter((t) => !STOP_WORDS.has(t));

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

// Never end a sentence after these (they precede a name or continue the sentence).
const NON_TERMINAL_ABBREVIATIONS = new Set(
  "mr mrs ms dr prof sr jr st vs e.g i.e cf ca approx apt ave blvd rd mt ft".split(" ")
);
// These precede a number ("No. 5", "Vol. 3").
const NUMBERING_ABBREVIATIONS = new Set("no vol pp fig ch sec art".split(" "));
const CLOSING_PUNCTUATION = /[.!?"'”’)\]]/;
const SENTENCE_START = /[A-Z0-9"'“‘(\[]/;

// Words a wrapped line can end on while the sentence carries on below.
const WRAP_CONTINUATION = /\b(?:a|an|the|to|of|in|on|at|for|and|or|with|by|from|is|are)$/i;
const SENTENCE_END = /[.!?]["'”’)\]]*$/;

/**
 * Whether the line break between two lines is structure (a heading, a
 * "Label: value" line, an address line) rather than hard-wrapping. Wrapped
 * prose lines are long, end mid-sentence and continue in lowercase; short
 * unpunctuated lines followed by a capital or number are kept apart.
 */
export const keepsLineBreak = (prev, next) => {
  const p = prev.trim();
  const n = next.trim();
  if (!p || !n || SENTENCE_END.test(p) || /^[a-z]/.test(n) || WRAP_CONTINUATION.test(p)) {
    return false;
  }
  return p.endsWith(":") || wordCount(p) <= 5;
};

const isSentenceEndingPeriod = (text, sentenceStart, dotIndex, nextChar) => {
  let wordStart = dotIndex;
  while (wordStart > sentenceStart && !/\s/.test(text[wordStart - 1])) wordStart--;
  const word = text.slice(wordStart, dotIndex).replace(/^[("'“‘[]+/, "");
  const lower = word.toLowerCase();
  if (NON_TERMINAL_ABBREVIATIONS.has(lower)) return false;
  // "7 p.m. Be early." ends a sentence; checked before the initials rule below.
  if (lower === "a.m" || lower === "p.m") return true;
  // Initials and dotted acronyms: "J. K. Rowling", "U.S.A."
  if (/^(?:[a-z]\.)*[a-z]$/i.test(word)) return false;
  if (NUMBERING_ABBREVIATIONS.has(lower) && /\d/.test(nextChar || "")) return false;
  return true;
};

/**
 * Splits text into sentences with their positions in `text`.
 *
 * A boundary is . ! or ? (plus any closing quotes/brackets) followed by
 * whitespace and a capital letter, digit, or opening quote. Blank lines and
 * bullet lines always start a new sentence. Periods after abbreviations and
 * initials, and inside numbers or emails, are not boundaries.
 *
 * @param {string} text - Text to split into sentences
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export const splitSentences = (text) => {
  if (!text || !text.trim()) return [];
  const sentences = [];
  const push = (from, to) => {
    while (from < to && /\s/.test(text[from])) from++;
    while (to > from && /\s/.test(text[to - 1])) to--;
    if (to > from) sentences.push({ text: text.slice(from, to), start: from, end: to });
  };

  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "\n") {
      let next = i + 1;
      while (next < text.length && /[ \t\r]/.test(text[next])) next++;
      const blankLine = text[next] === "\n";
      const bulletLine = /^(?:[-*•]\s|\d+[.)]\s)/.test(text.slice(next, next + 4));
      const lineEnd = text.indexOf("\n", next);
      const structural =
        !blankLine &&
        !bulletLine &&
        keepsLineBreak(
          text.slice(text.lastIndexOf("\n", i - 1) + 1, i),
          text.slice(next, lineEnd === -1 ? text.length : lineEnd)
        );
      if (blankLine || bulletLine || structural) {
        push(start, i);
        start = i + 1;
      }
      continue;
    }

    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    let end = i + 1;
    while (end < text.length && CLOSING_PUNCTUATION.test(text[end])) end++;
    let next = end;
    while (next < text.length && /\s/.test(text[next])) next++;
    const atEnd = next >= text.length;

    const isBoundary =
      atEnd ||
      (next > end &&
        SENTENCE_START.test(text[next]) &&
        (ch !== "." || isSentenceEndingPeriod(text, start, i, text[next])));

    if (isBoundary) {
      push(start, end);
      start = end;
    }
    i = end - 1;
  }
  push(start, text.length);
  return sentences;
};

const sentenceTexts = (text, sentences = []) =>
  sentences.length
    ? sentences.map((s) => (typeof s === "string" ? s : s.text))
    : splitSentences(text).map((s) => s.text);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * Extractive summary: scores sentences by how many of the document's frequent
 * words they contain (plus a bonus for dates/amounts and for the opening
 * sentence), then returns the best 2–3 in their original order.
 */
export const summarizeText = (text, sentences = []) => {
  if (!text) return "";
  const list = sentenceTexts(text, sentences);
  const maxSentences = list.length > 5 ? 3 : 2;
  if (list.length <= maxSentences) return list.join(" ").trim();

  const docFreq = {};
  list.forEach((s) =>
    new Set(contentTokens(s)).forEach((t) => {
      docFreq[t] = (docFreq[t] || 0) + 1;
    })
  );

  const scored = list.map((sentence, index) => {
    const tokens = contentTokens(sentence);
    const weight = tokens.reduce((acc, t) => acc + docFreq[t], 0);
    let score = tokens.length ? weight / Math.sqrt(tokens.length) : 0;
    if (DATE_TEST.test(sentence) || MONEY_TEST.test(sentence)) score += 2;
    if (index === 0) score += 1;
    return { sentence, index, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
    .join(" ")
    .trim();
};

// ---------------------------------------------------------------------------
// Simplification
// ---------------------------------------------------------------------------

const SIMPLER_WORDS = {
  "in order to": "to",
  "prior to": "before",
  "subsequent to": "after",
  "in the event that": "if",
  "due to the fact that": "because",
  "at this point in time": "now",
  "a large number of": "many",
  "with regard to": "about",
  regarding: "about",
  utilize: "use",
  utilise: "use",
  utilizes: "uses",
  utilized: "used",
  utilising: "using",
  utilizing: "using",
  utilised: "used",
  utilises: "uses",
  approximately: "about",
  commence: "start",
  commences: "starts",
  commenced: "started",
  commencing: "starting",
  initiate: "start",
  initiates: "starts",
  initiated: "started",
  initiating: "starting",
  assistance: "help",
  // "extra" (not "more") so a preceding "a"/"an" stays correct.
  additional: "extra",
  numerous: "many",
  terminate: "end",
  terminates: "ends",
  terminated: "ended",
  terminating: "ending",
  obtain: "get",
  obtains: "gets",
  obtained: "got",
  obtaining: "getting",
  require: "need",
  requires: "needs",
  required: "needed",
  requiring: "needing",
  demonstrate: "show",
  demonstrates: "shows",
  demonstrated: "showed",
  facilitate: "help",
  facilitates: "helps",
  facilitated: "helped",
  inquire: "ask",
  notify: "tell",
  inform: "tell",
  subsequently: "later",
  individuals: "people",
  modify: "change",
  remainder: "rest",
  ascertain: "find out",
  expedite: "speed up",
  prohibited: "not allowed",
  permitted: "allowed",
};

const SIMPLER_WORDS_PATTERN = new RegExp(
  `\\b(?:${Object.keys(SIMPLER_WORDS)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi"
);

const matchCase = (source, replacement) => {
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
};

// Only the opening filler word followed by a comma: "In addition to the fee"
// and "Thus far," are phrases, not connectives, and must stay.
const LEADING_CONNECTIVE =
  /^(?:however|therefore|moreover|furthermore|additionally|consequently|nevertheless|thus|hence|also|in addition),\s*/i;
const INNER_CONNECTIVE =
  /,\s*(?:however|therefore|moreover|furthermore|consequently|nevertheless)\s*,/gi;
// Split points inside a long sentence: "; " and ", but/and/so/yet/or ".
const CLAUSE_SPLIT = /;\s+|,\s+(?=(?:but|and|so|yet|or)\s)/i;
const MIN_CLAUSE_WORDS = 5;
// A comma that is not a thousands separator or decimal comma inside a number.
const LIST_COMMA = /(?<!\d),|,(?!\d{3})/;

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

const finishSentence = (s) => {
  let out = s.replace(LEADING_CONNECTIVE, "").replace(/^and\s+/i, "").trim();
  out = out.replace(/[,;:\s]+$/, "");
  if (!out) return "";
  out = out[0].toUpperCase() + out.slice(1);
  return /[.!?]["'”’)\]]*$/.test(out) ? out : `${out}.`;
};

// Split a long sentence into shorter ones, but only where both halves are
// substantial. Commas inside numbers and dates are never touched.
const splitClauses = (sentence) => {
  const match = CLAUSE_SPLIT.exec(sentence);
  if (!match) return [sentence];
  const head = sentence.slice(0, match.index);
  const tail = sentence.slice(match.index + match[0].length);
  if (wordCount(head) < MIN_CLAUSE_WORDS || wordCount(tail) < MIN_CLAUSE_WORDS) {
    return [sentence];
  }
  // "a form, a passport, and a receipt" is a list, not two clauses.
  if (match[0].startsWith(",") && LIST_COMMA.test(head)) return [sentence];
  return [head, ...splitClauses(tail)];
};

const LIST_ITEM = /^(?:[-*•]|\d+[.)])\s/;

// Joins hard-wrapped lines with a space; list items and structural line
// breaks (see keepsLineBreak) stay on their own lines.
const joinWrappedLines = (paragraph) => {
  const lines = paragraph.split(/[ \t]*\n[ \t]*/);
  return lines.reduce((out, line, i) => {
    if (i === 0) return line;
    const sep = LIST_ITEM.test(line) || keepsLineBreak(lines[i - 1], line) ? "\n" : " ";
    return `${out}${sep}${line}`;
  });
};

const simplifySentence = (sentence) =>
  sentence
    .replace(SIMPLER_WORDS_PATTERN, (m) => matchCase(m, SIMPLER_WORDS[m.toLowerCase()]))
    .replace(INNER_CONNECTIVE, "");

/**
 * Produces an easier-to-read version: plainer words, no filler connectives,
 * long sentences split into shorter ones. Paragraphs (separated by blank
 * lines), list items and heading/label lines are kept on their own lines;
 * hard-wrapped lines are joined.
 */
export const simplifyText = (text) => {
  if (!text) return "";
  return text
    .split(/\n[ \t]*\n\s*/)
    .map((paragraph) => {
      const joined = joinWrappedLines(paragraph.trim());
      const sentences = splitSentences(joined);
      const lineBreakBetween = (i) =>
        i >= 0 && i < sentences.length - 1 &&
        joined.slice(sentences[i].end, sentences[i + 1].start).includes("\n");

      return sentences
        .flatMap((s, i) => {
          const pieces = splitClauses(simplifySentence(s.text)).map(finishSentence).filter(Boolean);
          // A heading or "Label: value" line is not a sentence: don't invent a period.
          const nextIsList = i + 1 < sentences.length && LIST_ITEM.test(sentences[i + 1].text);
          const standalone =
            !LIST_ITEM.test(s.text) &&
            !SENTENCE_END.test(s.text) &&
            (lineBreakBetween(i - 1) || (lineBreakBetween(i) && !nextIsList));
          if (standalone && pieces.length === 1) pieces[0] = pieces[0].replace(/\.$/, "");
          return pieces.map((piece, j) => ({ piece, br: j === 0 && lineBreakBetween(i - 1) }));
        })
        .reduce((out, { piece, br }) => (out ? `${out}${br ? "\n" : " "}${piece}` : piece), "");
    })
    .filter(Boolean)
    .join("\n\n");
};

// ---------------------------------------------------------------------------
// Question answering
// ---------------------------------------------------------------------------

const analyzeQuestion = (question) => {
  const lower = question.toLowerCase();
  let questionType = "general";
  if (/\b(when|what time|what date|which day|deadline|due)\b/.test(lower)) {
    questionType = "date";
  } else if (/\b(how much|cost|price|fee|fees|amount|pay|charge)\b/.test(lower)) {
    questionType = "amount";
  }
  const keywords = [...new Set(contentTokens(question))];
  return {
    questionType,
    keywords,
    dates: [...question.matchAll(datePattern())].map((m) => m[0].toLowerCase()),
    amounts: [...question.matchAll(moneyPattern())].map((m) => m[0].toLowerCase()),
  };
};

export const NOT_FOUND = { found: false, answer: "", confidence: 0, source: null };

/**
 * Finds the sentence that best answers `question`. A sentence only counts as
 * an answer if it shares a keyword with the question or carries the kind of
 * information asked for (a date for "when", an amount for "how much").
 */
export const answerQuestion = (question, doc) => {
  if (!question?.trim() || !doc?.sentenceMeta?.length) return NOT_FOUND;
  const q = analyzeQuestion(question);
  if (!q.keywords.length && !q.dates.length && !q.amounts.length && q.questionType === "general") {
    return NOT_FOUND;
  }

  const scored = doc.sentenceMeta.map((meta, index) => {
    const lower = meta.text.toLowerCase();
    const keywordHits = q.keywords.filter((kw) => meta.termFreq[kw] > 0).length;
    let phraseHits = 0;
    for (let i = 0; i < q.keywords.length - 1; i++) {
      if (meta.termFreq[q.keywords[i]] && meta.termFreq[q.keywords[i + 1]]) phraseHits++;
    }
    const typeMatch =
      (q.questionType === "date" && DATE_TEST.test(meta.text)) ||
      (q.questionType === "amount" && MONEY_TEST.test(meta.text));
    const exactMatch = [...q.dates, ...q.amounts].some((v) => lower.includes(v));

    const score =
      keywordHits * 3 + phraseHits * 4 + (typeMatch ? 4 : 0) + (exactMatch ? 6 : 0);
    return { text: meta.text, index, score, keywordHits, typeMatch };
  });

  // Stable sort: on ties the earlier sentence wins.
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0) return NOT_FOUND;
  // A type match alone is too weak when the question has its own keywords.
  if (best.keywordHits === 0 && q.keywords.length > 1 && !best.typeMatch) return NOT_FOUND;

  const second = ranked[1]?.score || 0;
  const coverage = q.keywords.length ? best.keywordHits / q.keywords.length : 0;
  const margin = (best.score - second) / best.score;
  const confidence = Math.round(
    100 * Math.min(1, 0.6 * coverage + 0.2 * margin + (best.typeMatch ? 0.2 : 0))
  );

  return {
    found: true,
    answer: best.text,
    confidence: Math.max(10, confidence),
    source: { sentenceIndex: best.index },
  };
};

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Builds a document with all derived data from its raw text. Only
 * { id, rawText, createdAt } need to be stored; everything else is derived.
 */
export const buildDocument = (text, { id, createdAt } = {}) => {
  const cleaned = (text || "").trim();
  const sentenceData = splitSentences(cleaned);
  const sentences = sentenceData.map((s) => s.text);

  const sentenceMeta = sentenceData.map(({ text: sentence, start, end }) => {
    const termFreq = {};
    tokenize(sentence).forEach((t) => {
      termFreq[t] = (termFreq[t] || 0) + 1;
    });
    return { text: sentence, termFreq, range: { start, end } };
  });

  return {
    id: id || generateId(),
    rawText: cleaned,
    sentences,
    sentenceMeta,
    summary: summarizeText(cleaned, sentences),
    simplifiedText: simplifyText(cleaned),
    highlights: extractKeySpans(cleaned),
    createdAt: createdAt || new Date().toISOString(),
  };
};
