import { Text } from "react-native";

const buildHighlightMap = (highlights = []) => {
  const map = new Map();
  highlights.forEach((h) => {
    if (typeof h.index === "number" && h.value) {
      map.set(h.index, h.value);
    }
  });
  return map;
};

export const HighlightedText = ({
  text,
  dates = [],
  amounts = [],
  style,
  highlightStyle,
  sentences = [],
  activeSentenceIndex = null,
  highContrast = false,
  sentenceRanges: providedRanges = null,
}) => {
  if (!text) return null;
  const dateMap = buildHighlightMap(dates);
  const amountMap = buildHighlightMap(amounts);

  let sentenceRanges = [];
  if (providedRanges && Array.isArray(providedRanges)) {
    sentenceRanges = providedRanges.map((r) => [r.start, r.end]);
  } else {
    let cursor = 0;
    sentences.forEach((sentence) => {
      const idx = text.indexOf(sentence, cursor);
      if (idx >= 0) {
        sentenceRanges.push([idx, idx + sentence.length]);
        cursor = idx + sentence.length;
      } else {
        sentenceRanges.push([cursor, cursor + sentence.length]);
        cursor += sentence.length;
      }
    });
  }

  const activeRange =
    typeof activeSentenceIndex === "number" &&
    activeSentenceIndex >= 0 &&
    activeSentenceIndex < sentenceRanges.length
      ? sentenceRanges[activeSentenceIndex]
      : null;

  const getActiveStyle = (base) =>
    activeRange
      ? [
          base,
          {
            backgroundColor: highContrast ? "#ffff00" : "#e0f2fe",
            ...(highContrast
              ? { borderWidth: 2, borderColor: "#000000" }
              : null),
          },
        ]
      : base;

  const boundaries = new Set([0, text.length]);
  dateMap.forEach((value, index) => {
    boundaries.add(index);
    boundaries.add(index + value.length);
  });
  amountMap.forEach((value, index) => {
    boundaries.add(index);
    boundaries.add(index + value.length);
  });
  if (activeRange) {
    // Ensure active range boundaries are within text bounds
    boundaries.add(Math.max(0, Math.min(activeRange[0], text.length)));
    boundaries.add(Math.max(0, Math.min(activeRange[1], text.length)));
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  const segments = [];
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];
    const segmentText = text.substring(start, end);

    if (!segmentText) continue;

    let segmentStyle = style;
    let isHighlight = false;
    let highlightType = null;

    if (dateMap.has(start)) {
      isHighlight = true;
      highlightType = "date";
      segmentStyle = [
        activeRange && start >= activeRange[0] && start < activeRange[1]
          ? getActiveStyle(style)
          : style,
        highlightStyle,
        { flexShrink: 0 },
        highContrast
          ? {
              backgroundColor: "#ffff00",
              color: "#000000",
              borderWidth: 1,
              borderColor: "#000000",
            }
          : { backgroundColor: "#fff3cd", color: "#8a6d3b" },
      ];
    }
    else if (amountMap.has(start)) {
      isHighlight = true;
      highlightType = "amount";
      segmentStyle = [
        activeRange && start >= activeRange[0] && start < activeRange[1]
          ? getActiveStyle(style)
          : style,
        highlightStyle,
        { flexShrink: 0 },
        highContrast
          ? {
              backgroundColor: "#00ff00",
              color: "#000000",
              borderWidth: 1,
              borderColor: "#000000",
            }
          : { backgroundColor: "#e0f7f1", color: "#0f5132" },
      ];
    }
    else {
      const isActive =
        activeRange && start >= activeRange[0] && end <= activeRange[1];
      segmentStyle = isActive ? getActiveStyle(style) : style;
    }

    segments.push({
      text: segmentText,
      style: segmentStyle,
      key: `${isHighlight ? highlightType : "text"}-${start}`,
    });
  }

  return (
    <Text style={style} allowFontScaling={true}>
      {segments.map((segment) => (
        <Text key={segment.key} style={segment.style}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};
