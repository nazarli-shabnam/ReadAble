// Simple ID generator for React Native (no crypto dependency)
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Compatible regex without lookbehind for React Native/Hermes
const sentenceEndPattern = /([.!?])\s+(?=[A-Z0-9])/;
const datePattern =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/gi;
const moneyPattern =
  /\b(?:USD|EUR|GBP|\$|€|£)?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;

export const tokenize = (text) =>
  (text || "")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

// Extract question type and key terms
const analyzeQuestion = (question) => {
  const lower = question.toLowerCase();
  const tokens = tokenize(question);

  // Question type detection
  let questionType = "general";
  if (/\b(when|what time|what date|which day)\b/.test(lower)) {
    questionType = "date";
  } else if (
    /\b(how much|what.*cost|price|fee|amount|dollar|money)\b/.test(lower)
  ) {
    questionType = "amount";
  } else if (/\b(who|whom|whose)\b/.test(lower)) {
    questionType = "person";
  } else if (/\b(where|location|place)\b/.test(lower)) {
    questionType = "location";
  } else if (/\b(how|why|what|which)\b/.test(lower)) {
    questionType = "detail";
  }

  // Extract key entities (dates, amounts, names)
  const dates = [...question.matchAll(datePattern)];
  const amounts = [...question.matchAll(moneyPattern)];

  // Important keywords (excluding common question words)
  const stopWords = new Set([
    "the",
    "is",
    "are",
    "was",
    "were",
    "what",
    "when",
    "where",
    "who",
    "how",
    "why",
    "which",
    "can",
    "will",
    "does",
    "do",
  ]);
  const keywords = tokens.filter((t) => !stopWords.has(t));

  return {
    questionType,
    keywords,
    tokens,
    dates: dates.map((m) => m[0]),
    amounts: amounts.map((m) => m[0]),
  };
};

const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "vs",
  "etc",
  "inc",
  "ltd",
  "corp",
  "co",
  "st",
  "ave",
  "blvd",
  "rd",
  "apt",
  "no",
  "vol",
  "pp",
  "ed",
  "am",
  "pm",
  "e.g",
  "i.e",
  "cf",
  "ca",
  "approx",
  "est",
  "min",
  "max",
]);

const isAbbreviation = (word) => {
  if (!word) return false;
  const lower = word.toLowerCase().replace(/[.!?]$/, "");
  return ABBREVIATIONS.has(lower);
};

/**
 * Splits text into sentences with position tracking for efficient range calculation.
 * 
 * Algorithm:
 * 1. Iterates through text character by character
 * 2. Detects sentence endings (. ! ?) that are NOT:
 *    - Abbreviations (Dr., Mr., etc.)
 *    - Decimal numbers (3.14)
 * 3. Validates sentence boundary by checking next non-whitespace character
 * 4. Returns sentences with their start positions for efficient range calculation
 * 
 * @param {string} text - Text to split into sentences
 * @returns {Array<{text: string, start: number, end: number}>} Array of sentence objects with positions
 */
export const splitSentences = (text) => {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  
  // Split on sentence endings followed by space and capital letter/number
  // Compatible with React Native/Hermes (no lookbehind)
  // Optimized: Track positions during split to avoid expensive indexOf searches
  const sentences = [];
  let current = "";
  let sentenceStart = 0;
  
  // Find first non-whitespace in original text for accurate positioning
  let originalIndex = 0;
  while (originalIndex < text.length && /\s/.test(text[originalIndex])) {
    originalIndex++;
  }
  sentenceStart = originalIndex;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    current += char;
    
    if (/[.!?]/.test(char)) {
      // Check if this is likely an abbreviation (short word before punctuation)
      const beforePunct = current.trim().split(/\s+/).pop() || "";
      const isAbbrev = isAbbreviation(beforePunct);

      const isDecimal =
        /\./.test(char) &&
        i > 0 &&
        /\d/.test(trimmed[i - 1]) &&
        i < trimmed.length - 1 &&
        /\d/.test(trimmed[i + 1]);

      // Only split if not abbreviation and not decimal
      if (!isAbbrev && !isDecimal) {
        // Check if next non-whitespace is capital letter or number
        let j = i + 1;
        while (j < trimmed.length && /\s/.test(trimmed[j])) j++;
        if (j >= trimmed.length || /[A-Z0-9]/.test(trimmed[j])) {
          const sentenceText = current.trim();
          if (sentenceText) {
            const start = sentenceStart;
            const end = start + sentenceText.length;
            sentences.push({ text: sentenceText, start, end });
            sentenceStart = end;
            while (sentenceStart < text.length && /\s/.test(text[sentenceStart])) {
              sentenceStart++;
            }
          }
          current = "";
        }
      }
    }
  }
  
  if (current.trim()) {
    const sentenceText = current.trim();
    const start = sentenceStart;
    const end = start + sentenceText.length;
    sentences.push({ text: sentenceText, start, end });
  }
  
  return sentences.length > 0 ? sentences : [{ text: trimmed, start: 0, end: trimmed.length }];
};

export const extractKeySpans = (text) => {
  if (!text) return { dates: [], amounts: [] };
  const dates = [...text.matchAll(datePattern)].map((m) => ({
    id: generateId(),
    value: m[0],
    index: m.index != null ? m.index : 0,
  }));
  const amounts = [...text.matchAll(moneyPattern)].map((m) => ({
    id: generateId(),
    value: m[0],
    index: m.index != null ? m.index : 0,
  }));
  return { dates, amounts };
};

export const summarizeText = (text, sentences = []) => {
  if (!text) return "";
  if (sentences.length > 0) {
    const sentenceTexts = sentences.map(s => typeof s === 'string' ? s : s.text);
    return sentenceTexts.slice(0, 2).join(" ").trim();
  }
  return text.split(/\s+/).slice(0, 40).join(" ").trim();
};

export const simplifyText = (text, sentences = []) => {
  if (!text) return "";
  const sentenceTexts = sentences.length 
    ? sentences.map(s => typeof s === 'string' ? s : s.text)
    : splitSentences(text).map(s => s.text);
    
  const simpleSentences = sentenceTexts.map((s) =>
    s
      .replace(/[,;]/g, ".")
      .replace(
        /\b(however|therefore|moreover|furthermore|additionally)\b/gi,
        ""
      )
      .trim()
  );
  return simpleSentences.join(". ").replace(/\s+\./g, ".").trim();
};

export const answerQuestion = (question, doc) => {
  if (!question || !doc?.sentences?.length)
    return { answer: "", confidence: 0, source: null };

  const qAnalysis = analyzeQuestion(question);
  // Don't return empty if we have tokens, even if no keywords (after stop word filtering)
  if (
    !qAnalysis.tokens.length &&
    !qAnalysis.dates.length &&
    !qAnalysis.amounts.length
  ) {
    return { answer: "", confidence: 0, source: null };
  }

  // Score each sentence based on multiple factors
  const scored = doc.sentenceMeta.map((meta, idx) => {
    const sentence = meta.text;
    const sentenceLower = sentence.toLowerCase();
    let score = 0;

    // 1. Keyword matching (weighted by importance)
    let keywordMatches = 0;
    if (qAnalysis.keywords.length > 0) {
      keywordMatches = qAnalysis.keywords.filter(
        (kw) => meta.termFreq[kw] > 0 || sentenceLower.includes(kw)
      ).length;
      score += keywordMatches * 3; // Higher weight for keyword matches
    }

    // 2. Token frequency matching (use all tokens, not just keywords)
    const tokenMatches = qAnalysis.tokens.reduce(
      (acc, token) => acc + (meta.termFreq[token] || 0),
      0
    );
    score += tokenMatches * 2; // Increase weight for token matches

    // 3. Question type specific matching
    if (qAnalysis.questionType === "date") {
      // Boost sentences with dates
      const hasDate = datePattern.test(sentence);
      if (hasDate) score += 5;
      // If question mentions specific date, check for match
      if (qAnalysis.dates.length > 0) {
        const matchesDate = qAnalysis.dates.some((qDate) =>
          sentence.includes(qDate)
        );
        if (matchesDate) score += 10;
      }
    } else if (qAnalysis.questionType === "amount") {
      // Boost sentences with amounts
      const hasAmount = moneyPattern.test(sentence);
      if (hasAmount) score += 5;
      // If question mentions specific amount, check for match
      if (qAnalysis.amounts.length > 0) {
        const matchesAmount = qAnalysis.amounts.some((qAmount) =>
          sentence.includes(qAmount)
        );
        if (matchesAmount) score += 10;
      }
    }

    // 4. Exact phrase matching (for questions like "due date", "late fees")
    const questionPhrases = question
      .toLowerCase()
      .replace(/[?!]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3); // Take first few meaningful words

    for (let i = 0; i < questionPhrases.length - 1; i++) {
      const phrase = questionPhrases.slice(i, i + 2).join(" ");
      if (sentenceLower.includes(phrase)) {
        score += 8; // High boost for phrase matches
      }
    }

    // 5. Position bonus (earlier sentences often more relevant)
    const positionBonus =
      Math.max(0, (doc.sentenceMeta.length - idx) / doc.sentenceMeta.length) *
      2;
    score += positionBonus;

    return {
      sentence: meta.text,
      score,
      index: idx,
      keywordMatches: qAnalysis.keywords.length > 0 ? keywordMatches : 0,
      tokenMatches,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0]?.score || 0;
  const secondScore = scored[1]?.score || 0;

  // Calculate confidence based on score gap and absolute value
  let confidence = 0;
  if (topScore > 0) {
    const scoreGap = topScore - secondScore;
    const normalizedScore = Math.min(1, topScore / 20); // Normalize to 0-1
    confidence = Math.round(
      (normalizedScore * 0.7 + (scoreGap > 3 ? 0.3 : scoreGap / 10) * 0.3) * 100
    );
  }

  // Get best match
  const best = scored[0];

  if (best && best.score > 0) {
    // If we have a good match, return it (lower threshold to 1 instead of 3)
    if (best.score >= 1) {
      return {
        answer: best.sentence,
        confidence: Math.max(confidence, 40), // Minimum 40% if we found a match
        source: { sentenceIndex: best.index, sentence: best.sentence },
      };
    }
  }

  // If no good match, try to find relevant sentences from highlights
  if (qAnalysis.questionType === "date" && doc.highlights?.dates?.length > 0) {
    const relevantDate = doc.highlights.dates[0];
    const dateSentence = doc.sentences.find((s) =>
      s.includes(relevantDate.value)
    );
    if (dateSentence) {
      return {
        answer: dateSentence,
        confidence: 50,
        source: { type: "date_highlight" },
      };
    }
  }

  if (
    qAnalysis.questionType === "amount" &&
    doc.highlights?.amounts?.length > 0
  ) {
    const relevantAmount = doc.highlights.amounts[0];
    const amountSentence = doc.sentences.find((s) =>
      s.includes(relevantAmount.value)
    );
    if (amountSentence) {
      return {
        answer: amountSentence,
        confidence: 50,
        source: { type: "amount_highlight" },
      };
    }
  }

  // Fallback to summary if no good match
  if (doc.summary) {
    return {
      answer: doc.summary,
      confidence: 25,
      source: { type: "summary" },
    };
  }

  // Last resort: return first sentence
  return {
    answer: doc.sentences[0] || doc.rawText.slice(0, 200),
    confidence: 15,
    source: { type: "fallback" },
  };
};

export const detectStructure = (text) => {
  const structures = [];
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (/^[-*•]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      structures.push({ type: "list", lineIndex: idx, content: trimmed });
    } else if (/\|\s*\|/.test(trimmed)) {
      structures.push({ type: "table", lineIndex: idx, content: trimmed });
    } else if (/^#{1,6}\s/.test(trimmed)) {
      structures.push({ type: "heading", lineIndex: idx, content: trimmed });
    }
  });
  return structures;
};

export const buildDocument = (text) => {
  const cleaned = text.trim();
  // Optimized: splitSentences now returns positions, eliminating need for indexOf searches
  const sentenceData = splitSentences(cleaned);
  
  // Extract sentences and ranges efficiently
  const sentences = sentenceData.map(s => s.text);
  const sentenceRanges = sentenceData.map(s => ({ start: s.start, end: s.end }));

  const sentenceMeta = sentences.map((sentence, idx) => {
    const tokens = tokenize(sentence);
    const termFreq = tokens.reduce((acc, token) => {
      acc[token] = (acc[token] || 0) + 1;
      return acc;
    }, {});
    return {
      text: sentence,
      tokens,
      termFreq,
      range: sentenceRanges[idx] || { start: 0, end: sentence.length },
    };
  });
  const summary = summarizeText(cleaned, sentences);
  const simplifiedText = simplifyText(cleaned, sentences);
  const highlights = extractKeySpans(cleaned);
  const structures = detectStructure(cleaned);
  return {
    id: generateId(),
    rawText: cleaned,
    sentences,
    sentenceMeta,
    sentenceRanges, // Store ranges for HighlightedText
    summary,
    simplifiedText,
    highlights,
    structures,
    createdAt: new Date().toISOString(),
  };
};
