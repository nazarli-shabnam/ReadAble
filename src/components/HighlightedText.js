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
}) => {
  if (!text) return null;
  const dateMap = buildHighlightMap(dates);
  const amountMap = buildHighlightMap(amounts);
  const sentenceRanges = [];
  let cursor = 0;
  sentences.forEach((sentence) => {
    const idx = text.indexOf(sentence, cursor);
    if (idx >= 0) {
      sentenceRanges.push([idx, idx + sentence.length]);
      cursor = idx + sentence.length;
    }
  });
  const activeRange =
    typeof activeSentenceIndex === "number" && activeSentenceIndex >= 0
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

  const chunks = [];
  let i = 0;
  while (i < text.length) {
    if (dateMap.has(i)) {
      const value = dateMap.get(i);
      const isActive = activeRange && i >= activeRange[0] && i < activeRange[1];
      chunks.push(
        <Text
          key={`date-${i}`}
          style={[
            isActive ? getActiveStyle(style) : style,
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
          ]}
        >
          {value}
        </Text>
      );
      i += value.length;
      continue;
    }
    if (amountMap.has(i)) {
      const value = amountMap.get(i);
      const isActive = activeRange && i >= activeRange[0] && i < activeRange[1];
      chunks.push(
        <Text
          key={`amt-${i}`}
          style={[
            isActive ? getActiveStyle(style) : style,
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
          ]}
        >
          {value}
        </Text>
      );
      i += value.length;
      continue;
    }

    const isActive = activeRange && i >= activeRange[0] && i < activeRange[1];
    let chunkText = text[i];
    let j = i + 1;
    // Coalesce consecutive characters with same active state
    while (
      j < text.length &&
      !(dateMap.has(j) || amountMap.has(j)) &&
      (!!activeRange === !!activeRange) &&
      (!!isActive ===
        (activeRange && j >= activeRange[0] && j < activeRange[1]))
    ) {
      const nextActive =
        activeRange && j >= activeRange[0] && j < activeRange[1];
      if (nextActive !== isActive) break;
      chunkText += text[j];
      j += 1;
    }
    chunks.push(
      <Text
        key={`char-${i}`}
        style={[isActive ? getActiveStyle(style) : style, { flexShrink: 0 }]}
      >
        {chunkText}
      </Text>
    );
    i = j;
  }

  return (
    <Text style={style} allowFontScaling={true}>
      {chunks}
    </Text>
  );
};
