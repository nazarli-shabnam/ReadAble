import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { UI_FONT, useTheme } from "../theme";
import { Button, Card, Txt } from "./ui";

/**
 * Where text comes in: scan a photo, pick one, try the example, or type.
 * `scanning` shows progress while OCR runs.
 */
export const InputCard = ({
  text,
  onChangeText,
  onScan,
  onPickImage,
  onPickFile,
  onUseSample,
  onSubmit,
  scanning,
  processing,
}) => {
  const t = useTheme();
  const busy = scanning || processing;
  return (
    <Card title="Add text">
      <View style={styles.row}>
        <Button label="Scan with camera" onPress={onScan} disabled={busy} />
        <Button label="Choose a photo" onPress={onPickImage} disabled={busy} />
        <Button label="Open a text file" onPress={onPickFile} disabled={busy} />
        <Button label="Try an example" variant="quiet" onPress={onUseSample} disabled={busy} />
      </View>

      {scanning ? (
        <View style={styles.scanning} accessibilityLiveRegion="polite">
          <ActivityIndicator color={t.accent} />
          <Txt muted>Reading text from the image…</Txt>
        </View>
      ) : null}

      <TextInput
        multiline
        value={text}
        onChangeText={onChangeText}
        placeholder="Paste or type text here, or scan a photo."
        placeholderTextColor={t.inkMuted}
        accessibilityLabel="Text to read"
        editable={!scanning}
        style={[
          styles.textArea,
          {
            backgroundColor: t.field,
            borderColor: t.border,
            borderWidth: t.borderWidth,
            color: t.ink,
            fontFamily: UI_FONT.regular,
          },
        ]}
      />

      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Button
          label="Open in reader"
          variant="primary"
          onPress={onSubmit}
          disabled={busy || !text.trim()}
          style={{ flexGrow: 1 }}
        >
          {processing ? <ActivityIndicator color={t.onAccent} /> : null}
        </Button>
        {text.length > 0 && (
          <Button
            label="Clear"
            variant="quiet"
            accessibilityLabel="Clear the text box"
            onPress={() => onChangeText("")}
            disabled={busy}
          />
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scanning: { flexDirection: "row", alignItems: "center", gap: 10 },
  textArea: {
    minHeight: 140,
    maxHeight: 320,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
});
