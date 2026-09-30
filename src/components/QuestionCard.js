import { useEffect, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { UI_FONT, useTheme } from "../theme";
import { error } from "../utils/logger";
import { Button, Card, Txt } from "./ui";

/**
 * Ask about the active document. `ask(question)` returns
 * { found, answer, confidence, source }.
 */
export const QuestionCard = ({ docId, ask, speech }) => {
  const t = useTheme();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);

  // A new document makes the previous answer meaningless.
  useEffect(() => {
    setResult(null);
  }, [docId]);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const canAsk = Boolean(docId && question.trim());
  const submit = () => {
    if (!canAsk) return;
    setResult(ask(question.trim()));
    setCopied(false);
  };

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(result.answer);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      error("Clipboard error", err);
    }
  };

  const readingAnswer = speech.source === "answer" && speech.status === "speaking";

  return (
    <Card title="Ask about the text">
      <TextInput
        value={question}
        onChangeText={setQuestion}
        onSubmitEditing={submit}
        returnKeyType="search"
        placeholder={docId ? "For example: When is the deadline?" : "Open some text first"}
        placeholderTextColor={t.inkMuted}
        accessibilityLabel="Your question"
        editable={Boolean(docId)}
        style={[
          styles.input,
          {
            backgroundColor: t.field,
            borderColor: t.border,
            borderWidth: t.borderWidth,
            color: t.ink,
            fontFamily: UI_FONT.regular,
          },
        ]}
      />
      <Button label="Ask" variant="primary" onPress={submit} disabled={!canAsk} />

      {result && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.answer, { backgroundColor: t.field, borderColor: t.border, borderWidth: t.borderWidth }]}
        >
          {result.found ? (
            <>
              <Txt>{result.answer}</Txt>
              <Txt variant="caption" muted>
                From sentence {result.source.sentenceIndex + 1}. Match: {result.confidence}%.
              </Txt>
              <View style={styles.row}>
                <Button
                  label={readingAnswer ? "Stop reading" : "Read aloud"}
                  onPress={() =>
                    readingAnswer ? speech.stop() : speech.play([result.answer], 0, "answer")
                  }
                />
                <Button
                  label={copied ? "Copied ✓" : "Copy"}
                  accessibilityLabel={copied ? "Answer copied" : "Copy answer"}
                  onPress={copy}
                />
              </View>
            </>
          ) : (
            <Txt>
              I couldn’t find that in this text. Try asking with words that appear in it.
            </Txt>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  input: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  answer: { borderRadius: 12, padding: 14, gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
