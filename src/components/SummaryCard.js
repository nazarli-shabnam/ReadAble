import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme";
import { uniqueKeySpans } from "../utils/textProcessing";
import { Button, Card, Txt } from "./ui";

// Assumes a gentle 150 words per minute rather than the usual 200-250.
const WORDS_PER_MINUTE = 150;

const Fact = ({ kind, value }) => {
  const t = useTheme();
  const colors = kind === "date" ? [t.date, t.onDate] : [t.amount, t.onAmount];
  return (
    <View
      style={[
        styles.fact,
        {
          backgroundColor: colors[0],
          borderColor: t.name === "highContrast" ? t.ink : colors[0],
          borderWidth: t.borderWidth,
        },
      ]}
      accessibilityLabel={`${kind === "date" ? "Date or time" : "Amount"}: ${value}`}
    >
      <Txt
        variant="label"
        style={{ color: colors[1], textDecorationLine: kind === "date" ? "underline" : "none" }}
      >
        {value}
      </Txt>
    </View>
  );
};

export const SummaryCard = ({ doc, onShare }) => {
  if (!doc) return null;
  const words = doc.rawText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  const facts = uniqueKeySpans(doc.rawText);

  return (
    <Card
      title="Summary"
      action={<Button label="Share" onPress={onShare} accessibilityLabel="Share the summary" />}
    >
      <Txt>{doc.summary}</Txt>

      {facts.length > 0 && (
        <View style={{ gap: 8 }}>
          <Txt variant="label">Key details</Txt>
          <View style={styles.facts}>
            {facts.map((f) => (
              <Fact key={f.start} kind={f.type} value={f.value} />
            ))}
          </View>
        </View>
      )}

      <Txt variant="caption" muted>
        {words} {words === 1 ? "word" : "words"}, {doc.sentences.length}{" "}
        {doc.sentences.length === 1 ? "sentence" : "sentences"}. About {minutes} min to read.
      </Txt>
    </Card>
  );
};

const styles = StyleSheet.create({
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fact: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
