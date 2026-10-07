import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SETTING_LIMITS, clampToStep } from "../constants/settings";
import { FONT_FACES, useTheme, withOpacity } from "../theme";
import { HighlightedText } from "./HighlightedText";
import { ReadingSettings } from "./ReadingSettings";
import { Button, Card, Segmented, Txt } from "./ui";

const VIEW_OPTIONS = [
  { value: "simplified", label: "Simplified" },
  { value: "original", label: "Original" },
];

const PlayerBar = ({ speech, readingIndex, sentenceTexts, startIndex, rate, onRateChange, disabled }) => {
  const t = useTheme();
  // The same speech engine also reads Q&A answers; this bar only controls the document.
  const status = speech.source === "document" ? speech.status : "idle";
  const active = status !== "idle";
  const playLabel = status === "speaking" ? "Pause" : status === "paused" ? "Resume" : "Listen";
  const onPlay = () => {
    if (status === "speaking") speech.pause();
    else if (status === "paused") speech.resume();
    else speech.play(sentenceTexts, startIndex);
  };
  const progress = readingIndex !== null ? (readingIndex + 1) / speech.total : 0;
  const rateLimits = SETTING_LIMITS.ttsRate;

  return (
    <View style={[styles.player, { borderTopColor: t.border, borderTopWidth: t.borderWidth }]}>
      {readingIndex !== null && (
        <View style={{ gap: 6 }}>
          <Txt variant="caption" muted accessibilityLiveRegion="polite">
            {status === "paused" ? "Paused on" : "Reading"} sentence {readingIndex + 1} of{" "}
            {speech.total}
          </Txt>
          <View style={[styles.track, { backgroundColor: t.field, borderColor: t.border }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: t.accent }]} />
          </View>
        </View>
      )}
      <View style={styles.row}>
        <Button
          label="⏮"
          accessibilityLabel="Previous sentence"
          onPress={speech.prev}
          disabled={!active || readingIndex === 0}
        />
        <Button
          label={playLabel}
          variant="primary"
          onPress={onPlay}
          disabled={disabled}
          style={{ flexGrow: 1 }}
        />
        <Button
          label="⏭"
          accessibilityLabel="Next sentence"
          onPress={speech.next}
          disabled={!active || readingIndex === speech.total - 1}
        />
        <Button label="Stop" onPress={speech.stop} disabled={!active} />
      </View>
      <View style={[styles.row, { alignItems: "center" }]}>
        <Txt variant="label" style={{ flex: 1 }}>
          Voice speed
        </Txt>
        <Button
          label="−"
          accessibilityLabel={`Slower, now ${rate.toFixed(1)} times`}
          disabled={rate <= rateLimits.min}
          onPress={() => onRateChange(clampToStep(rate - rateLimits.step, rateLimits))}
        />
        <Txt variant="label" style={{ minWidth: 52, textAlign: "center" }}>
          {rate.toFixed(1)}×
        </Txt>
        <Button
          label="+"
          accessibilityLabel={`Faster, now ${rate.toFixed(1)} times`}
          disabled={rate >= rateLimits.max}
          onPress={() => onRateChange(clampToStep(rate + rateLimits.step, rateLimits))}
        />
      </View>
    </View>
  );
};

/**
 * The reading surface. `sentences` are the ranges of `text` (the text for the
 * current view mode); the same list drives highlighting, focus mode and speech.
 */
export const ReaderCard = ({
  doc,
  text,
  sentences,
  viewMode,
  onViewModeChange,
  settings,
  onSettingsChange,
  speech,
  readingIndex,
  focusIndex,
  onFocusIndexChange,
  onLayout,
}) => {
  const t = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const face = FONT_FACES[settings.fontFamily];
  const sentenceTexts = sentences.map((s) => s.text);

  const textStyle = {
    fontSize: settings.fontSize,
    lineHeight: Math.round(settings.fontSize * settings.lineSpacing),
    letterSpacing: settings.letterSpacing,
    color: t.ink,
    fontFamily: face.regular,
  };
  const highlightStyle = { fontFamily: face.bold, fontWeight: face.bold ? undefined : "700" };
  const pageStyle = {
    backgroundColor:
      settings.overlayEnabled && t.name !== "highContrast"
        ? withOpacity(settings.overlayColor, settings.overlayOpacity)
        : t.field,
    borderColor: t.border,
    borderWidth: t.name === "highContrast" ? t.borderWidth : 0,
  };
  const listenFrom = (index) => speech.play(sentenceTexts, index);

  const focusSentence = sentences[focusIndex];
  const focusText = focusSentence?.text || "";

  return (
    <Card
      title="Reader"
      emphasis
      onLayout={onLayout}
      action={
        <Button
          label="Aa"
          accessibilityLabel={settingsOpen ? "Hide reading settings" : "Show reading settings"}
          selected={settingsOpen}
          onPress={() => setSettingsOpen((v) => !v)}
        />
      }
    >
      {settingsOpen && <ReadingSettings settings={settings} onChange={onSettingsChange} />}

      {!doc ? (
        <Txt muted>Add some text above and choose “Open in reader”. It will appear here.</Txt>
      ) : (
        <>
          <Segmented
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={onViewModeChange}
            accessibilityLabel="Text version"
          />

          <View style={[styles.page, pageStyle]}>
            {settings.focusMode ? (
              <View style={{ gap: 14 }}>
                <HighlightedText
                  text={focusText}
                  sentences={[{ start: 0, end: focusText.length }]}
                  activeSentenceIndex={readingIndex === focusIndex ? 0 : null}
                  onSentencePress={() => listenFrom(focusIndex)}
                  style={textStyle}
                  highlightStyle={highlightStyle}
                />
                <Txt muted accessibilityLiveRegion="polite">
                  Sentence {focusIndex + 1} of {sentences.length}
                </Txt>
                <View style={styles.row}>
                  <Button
                    label="Previous"
                    accessibilityLabel="Previous sentence"
                    disabled={focusIndex === 0}
                    onPress={() => onFocusIndexChange(focusIndex - 1)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Next"
                    accessibilityLabel="Next sentence"
                    disabled={focusIndex >= sentences.length - 1}
                    onPress={() => onFocusIndexChange(focusIndex + 1)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <HighlightedText
                text={text}
                sentences={sentences}
                activeSentenceIndex={readingIndex}
                onSentencePress={listenFrom}
                style={textStyle}
                highlightStyle={highlightStyle}
              />
            )}
          </View>
          <Txt variant="caption" muted>
            Tap a sentence to listen from there. Dates and times are marked in yellow, amounts in
            green.
          </Txt>

          <PlayerBar
            speech={speech}
            readingIndex={readingIndex}
            sentenceTexts={sentenceTexts}
            startIndex={settings.focusMode ? focusIndex : 0}
            rate={settings.ttsRate}
            onRateChange={(ttsRate) => onSettingsChange({ ttsRate })}
            disabled={!sentences.length}
          />
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  page: { borderRadius: 12, padding: 18 },
  player: { paddingTop: 14, gap: 12 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", borderWidth: 0 },
  fill: { height: "100%" },
});
