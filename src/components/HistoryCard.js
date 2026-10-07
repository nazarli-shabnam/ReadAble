import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { formatDistanceToNow } from "date-fns";
import { splitSentences } from "../utils/textProcessing";
import { UI_FONT, useTheme } from "../theme";
import { Button, Card, Txt } from "./ui";

const COLLAPSED_COUNT = 5;
const TITLE_LENGTH = 80;
const SEARCH_THRESHOLD = 5; // with fewer saved texts a search box is clutter

/** First sentence, cut at a word boundary; "…" only when something was cut. */
export const documentTitle = (rawText) => {
  const first = (splitSentences(rawText)[0]?.text || rawText).replace(/\s+/g, " ");
  if (first.length <= TITLE_LENGTH) return first;
  const cut = first.slice(0, TITLE_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : TITLE_LENGTH)}…`;
};

/** Pinned texts first, then the rest in their saved (newest first) order. */
export const orderHistory = (history) => [
  ...history.filter((r) => r.pinned),
  ...history.filter((r) => !r.pinned),
];

/** Records whose title or text contains every word of `query` (case-insensitive). */
export const searchHistory = (history, query) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return history;
  return history.filter((r) => {
    const haystack = `${r.title || ""} ${r.rawText}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
};

const HistoryItem = ({ record, active, onOpen, onDelete, onUpdateMeta }) => {
  const t = useTheme();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const title = record.title || documentTitle(record.rawText);
  const when = formatDistanceToNow(new Date(record.createdAt), { addSuffix: true });
  const inputStyle = {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: t.borderWidth,
    color: t.ink,
    fontFamily: UI_FONT.regular,
  };

  const startRename = () => {
    setDraft(record.title || "");
    setRenaming(true);
  };
  const saveRename = () => {
    onUpdateMeta(record.id, { title: draft });
    setRenaming(false);
  };

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
      <View style={styles.itemTop}>
        <Pressable
          onPress={() => onOpen(record.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open: ${title}, saved ${when}${record.pinned ? ", pinned" : ""}`}
          accessibilityState={{ selected: active }}
          style={({ pressed }) => [styles.itemBody, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Txt numberOfLines={2} style={active && { color: t.onSelected }}>
            {record.pinned ? "📌 " : ""}
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

      {renaming ? (
        <View style={styles.actions}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={saveRename}
            autoFocus
            maxLength={120}
            placeholder="Name (empty = first sentence)"
            placeholderTextColor={t.inkMuted}
            accessibilityLabel="Name for this text"
            style={[styles.input, inputStyle]}
          />
          <Button label="Save" variant="primary" onPress={saveRename} />
          <Button label="Cancel" variant="quiet" onPress={() => setRenaming(false)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button
            label={record.pinned ? "Unpin" : "Pin"}
            variant="quiet"
            accessibilityLabel={`${record.pinned ? "Unpin" : "Pin"}: ${title}`}
            onPress={() => onUpdateMeta(record.id, { pinned: !record.pinned })}
          />
          <Button
            label="Rename"
            variant="quiet"
            accessibilityLabel={`Rename: ${title}`}
            onPress={startRename}
          />
        </View>
      )}
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
  onUpdateMeta,
  onClearAll,
  onRetry,
}) => {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const matches = searchHistory(orderHistory(history), query);
  const searching = query.trim().length > 0;
  const shown = expanded || searching ? matches : matches.slice(0, COLLAPSED_COUNT);

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
        {history.length > SEARCH_THRESHOLD && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search saved texts"
            placeholderTextColor={t.inkMuted}
            accessibilityLabel="Search saved texts"
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
        )}
        {searching && !matches.length && <Txt muted>No saved text matches “{query.trim()}”.</Txt>}
        {shown.map((record) => (
          <HistoryItem
            key={record.id}
            record={record}
            active={record.id === activeId}
            onOpen={onOpen}
            onDelete={onDelete}
            onUpdateMeta={onUpdateMeta}
          />
        ))}
        {!searching && matches.length > COLLAPSED_COUNT && (
          <Button
            label={expanded ? "Show fewer" : `Show all ${matches.length}`}
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
  item: { borderRadius: 12 },
  itemTop: { flexDirection: "row", alignItems: "center", paddingLeft: 12 },
  itemBody: { flex: 1, paddingVertical: 10, gap: 2 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  input: { flexGrow: 1, minHeight: 44, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
});
