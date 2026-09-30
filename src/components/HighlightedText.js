import { useMemo } from "react";
import { Text } from "react-native";
import { findKeySpans } from "../utils/textProcessing";

const SPAN_COLORS = {
  normal: {
    date: { backgroundColor: "#fff3cd", color: "#6b4f1d" },
    amount: { backgroundColor: "#dcf5ea", color: "#0f5132" },
    active: { backgroundColor: "#dbeafe" },
  },
  highContrast: {
    date: { backgroundColor: "#ffff00", color: "#000000" },
    amount: { backgroundColor: "#00ff66", color: "#000000" },
    active: { backgroundColor: "#00e5ff" },
  },
};

/**
 * Renders `text` with dates/amounts highlighted (found in the text being
 * shown, so the positions always line up) and the active sentence shaded.
 *
 * @param {Array<{start: number, end: number}>} sentences - sentence ranges in `text`
 * @param {(index: number) => void} [onSentencePress] - makes each sentence tappable
 */
export const HighlightedText = ({
  text,
  style,
  highlightStyle,
  sentences = [],
  activeSentenceIndex = null,
  highContrast = false,
  onSentencePress,
}) => {
  const spans = useMemo(() => findKeySpans(text), [text]);

  const segments = useMemo(() => {
    if (!text) return [];
    const boundaries = new Set([0, text.length]);
    spans.forEach((s) => {
      boundaries.add(s.start);
      boundaries.add(s.end);
    });
    sentences.forEach((s) => {
      boundaries.add(Math.max(0, Math.min(s.start, text.length)));
      boundaries.add(Math.max(0, Math.min(s.end, text.length)));
    });
    const sorted = [...boundaries].sort((a, b) => a - b);

    const result = [];
    let spanIdx = 0;
    let sentenceIdx = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (start === end) continue;
      while (spanIdx < spans.length && spans[spanIdx].end <= start) spanIdx++;
      while (sentenceIdx < sentences.length && sentences[sentenceIdx].end <= start) sentenceIdx++;
      const span = spans[spanIdx]?.start <= start ? spans[spanIdx] : null;
      const sentence = sentences[sentenceIdx]?.start <= start ? sentenceIdx : null;
      result.push({ start, text: text.slice(start, end), type: span?.type, sentence });
    }
    return result;
  }, [text, spans, sentences]);

  if (!text) return null;
  const colors = highContrast ? SPAN_COLORS.highContrast : SPAN_COLORS.normal;

  return (
    <Text style={style}>
      {segments.map((seg) => {
        const active = seg.sentence !== null && seg.sentence === activeSentenceIndex;
        return (
          <Text
            key={seg.start}
            style={[
              active && colors.active,
              seg.type && highlightStyle,
              seg.type && colors[seg.type],
            ]}
            onPress={
              onSentencePress && seg.sentence !== null
                ? () => onSentencePress(seg.sentence)
                : undefined
            }
            suppressHighlighting
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
};
