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
  const chunks = [];
  let i = 0;

  while (i < text.length) {
    const isActive = activeRange && i >= activeRange[0] && i < activeRange[1];
    const baseStyle = isActive
      ? [
          style,
          highContrast
            ? {
                backgroundColor: "#ffff00",
                borderWidth: 2,
                borderColor: "#000000",
              }
            : { backgroundColor: "#e0f2fe" },
        ]
      : style;
    if (dateMap.has(i)) {
      const value = dateMap.get(i);
      chunks.push(
        <Text
          key={`date-${i}`}
          style={[
            baseStyle,
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
      chunks.push(
        <Text
          key={`amt-${i}`}
          style={[
            baseStyle,
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
    chunks.push(
      <Text key={`char-${i}`} style={[baseStyle, { flexShrink: 0 }]}>
        {text[i]}
      </Text>
    );
    i += 1;
  }

  return (
    <Text style={style} allowFontScaling={true}>
      {chunks}
    </Text>
  );
};
