import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { splitSentences } from "../utils/textProcessing";
import { useTheme } from "../theme";
import { Button, Card, Txt } from "./ui";

const COLLAPSED_COUNT = 5;
const TITLE_LENGTH = 80;

/** First sentence, cut at a word boundary; "…" only when something was cut. */
export const documentTitle = (rawText) => {
  const first = (splitSentences(rawText)[0]?.text || rawText).replace(/\s+/g, " ");
  if (first.length <= TITLE_LENGTH) return first;
  const cut = first.slice(0, TITLE_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : TITLE_LENGTH)}…`;
};

const HistoryItem = ({ record, active, onOpen, onDelete }) => {
  const t = useTheme();
  const title = documentTitle(record.rawText);
  const when = formatDistanceToNow(new Date(record.createdAt), { addSuffix: true });
  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor: active ? t.selected : t.field,
          borderColor: active ? t.accent : t.border,
          borderWidth: active ? Math.max(2, t.borderWidth) : t.borderWidth,
        },
      ]}
    >
      <Pressable
        onPress={() => onOpen(record.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open: ${title}, saved ${when}`}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [styles.itemBody, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Txt numberOfLines={2} style={active && { color: t.onSelected }}>
          {title}
        </Txt>
        <Txt variant="caption" muted>
          {active ? "Open now. " : ""}Saved {when}
        </Txt>
      </Pressable>
      <Button
        label="✕"
        variant="quiet"
        accessibilityLabel={`Delete: ${title}`}
        onPress={() => onDelete(record.id)}
      />
    </View>
  );
};

export const HistoryCard = ({
  history,
  activeId,
  loading,
  error,
  onOpen,
  onDelete,
  onClearAll,
  onRetry,
}) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? history : history.slice(0, COLLAPSED_COUNT);

  let body;
  if (loading) {
    body = <ActivityIndicator accessibilityLabel="Loading saved texts" />;
  } else if (error) {
    body = (
      <View style={{ gap: 10 }}>
        <Txt>{error} Your saved texts have not been deleted.</Txt>
        <Button label="Try again" variant="primary" onPress={onRetry} />
      </View>
    );
  } else if (!history.length) {
    body = <Txt muted>Texts you open in the reader are saved here on this device.</Txt>;
  } else {
    body = (
      <View style={{ gap: 8 }}>
        {shown.map((record) => (
          <HistoryItem
            key={record.id}
            record={record}
            active={record.id === activeId}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
        {history.length > COLLAPSED_COUNT && (
          <Button
            label={expanded ? "Show fewer" : `Show all ${history.length}`}
            variant="quiet"
            onPress={() => setExpanded((v) => !v)}
          />
        )}
      </View>
    );
  }

  return (
    <Card
      title="Saved texts"
      action={
        history.length > 0 && !loading ? (
          <Button label="Clear all" variant="danger" onPress={onClearAll} />
        ) : null
      }
    >
      {body}
    </Card>
  );
};

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingLeft: 12 },
  itemBody: { flex: 1, paddingVertical: 10, gap: 2 },
});
