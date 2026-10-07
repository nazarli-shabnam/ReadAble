import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { error } from "../utils/logger";
import { SETTING_LIMITS, clampToStep } from "../constants/settings";
import { originalAt } from "../utils/textProcessing";
import { FONT_FACES, useTheme, withOpacity } from "../theme";
import { HighlightedText } from "./HighlightedText";
import { ReadingSettings } from "./ReadingSettings";
import { Button, Card, Segmented, Txt } from "./ui";

const RULER_LINES = 2;

/**
 * Where the reading ruler sits. All lines have the same height (the reader sets
 * `lineHeight` explicitly), so no text measurement is needed.
 * @returns {{line: number, top: number, height: number, lastLine: number, lineCount: number}}
 */
export const rulerGeometry = (line, textHeight, lineHeight) => {
  const lineCount = Math.max(1, Math.round(textHeight / lineHeight));
  const lastLine = Math.max(0, lineCount - RULER_LINES);
  const clamped = Math.min(Math.max(0, line), lastLine);
  const lines = Math.min(RULER_LINES, lineCount);
  return { line: clamped, top: clamped * lineHeight, height: lines * lineHeight, lastLine, lineCount };
};

const VIEW_OPTIONS = [
  { value: "simplified", label: "Simplified" },
  { value: "original", label: "Original" },
];

const PlayerBar = ({
  speech,
  readingIndex,
  sentenceTexts,
  startIndex,
  continuing,
  rate,
  onRateChange,
  disabled,
}) => {
  const t = useTheme();
  // The same speech engine also reads Q&A answers; this bar only controls the document.
  const status = speech.source === "document" ? speech.status : "idle";
  const active = status !== "idle";
  const playLabel =
    status === "speaking" ? "Pause" : status === "paused" ? "Resume" : continuing ? "Continue" : "Listen";
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
      {continuing && !active && (
        <Button
          label={`From the start (continuing from sentence ${startIndex + 1})`}
          variant="quiet"
          onPress={() => speech.play(sentenceTexts, 0)}
        />
      )}
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
  voices = [],
  readingIndex,
  markedIndex,
  resumeIndex = 0,
  focusIndex,
  onFocusIndexChange,
  onLayout,
}) => {
  const t = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Simplified sentence (index into `sentences`) whose original wording is shown.
  const [originalIndex, setOriginalIndex] = useState(null);
  const [rulerLine, setRulerLine] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  useEffect(() => {
    setOriginalIndex(null);
    setRulerLine(0);
  }, [text]);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  const copyText = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      error("Clipboard error", err);
    }
  };
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

  // The sentence being read aloud wins over a sentence marked from a Q&A answer.
  const activeIndex = readingIndex ?? markedIndex;
  const canShowOriginal = viewMode === "simplified";
  const originalWording =
    canShowOriginal && originalIndex !== null && sentences[originalIndex]
      ? originalAt(doc.simplifiedSources, sentences[originalIndex].start)
      : null;
  const ruler =
    settings.readingRuler && !settings.focusMode && textHeight > 0
      ? rulerGeometry(rulerLine, textHeight, textStyle.lineHeight)
      : null;
  const dim = withOpacity(t.ink, 0.5);
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
      {settingsOpen && (
        <ReadingSettings settings={settings} onChange={onSettingsChange} voices={voices} speech={speech} />
      )}

      {!doc ? (
        <Txt muted>Add some text above and choose “Open in reader”. It will appear here.</Txt>
      ) : (
        <>
          <View style={styles.row}>
            <Segmented
              options={VIEW_OPTIONS}
              value={viewMode}
              onChange={onViewModeChange}
              accessibilityLabel="Text version"
            />
            <Button
              label={copied ? "Copied ✓" : "Copy text"}
              accessibilityLabel={copied ? "Text copied" : `Copy the ${viewMode} text`}
              variant="quiet"
              onPress={copyText}
            />
          </View>

          <View style={[styles.page, pageStyle]}>
            {settings.focusMode ? (
              <View style={{ gap: 14 }}>
                <HighlightedText
                  text={focusText}
                  sentences={[{ start: 0, end: focusText.length }]}
                  activeSentenceIndex={activeIndex === focusIndex ? 0 : null}
                  onSentencePress={() => listenFrom(focusIndex)}
                  onSentenceLongPress={canShowOriginal ? () => setOriginalIndex(focusIndex) : undefined}
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
                {canShowOriginal && (
                  <Button label="Show original wording" onPress={() => setOriginalIndex(focusIndex)} />
                )}
              </View>
            ) : (
              <View testID="reader-text" onLayout={(e) => setTextHeight(e.nativeEvent.layout.height)}>
                <HighlightedText
                  text={text}
                  sentences={sentences}
                  activeSentenceIndex={activeIndex}
                  onSentencePress={listenFrom}
                  onSentenceLongPress={canShowOriginal ? setOriginalIndex : undefined}
                  style={textStyle}
                  highlightStyle={highlightStyle}
                />
                {ruler && (
                  <>
                    <View
                      pointerEvents="none"
                      style={[styles.dim, { top: 0, height: ruler.top, backgroundColor: dim }]}
                    />
                    <View
                      pointerEvents="none"
                      style={[styles.dim, { top: ruler.top + ruler.height, bottom: 0, backgroundColor: dim }]}
                    />
                  </>
                )}
              </View>
            )}
          </View>
          {originalWording !== null && (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.original, { backgroundColor: t.field, borderColor: t.border, borderWidth: t.borderWidth }]}
            >
              <Txt variant="label">Original wording</Txt>
              <Txt>{originalWording}</Txt>
              <Button label="Close" variant="quiet" onPress={() => setOriginalIndex(null)} />
            </View>
          )}
          {ruler && (
            <View style={styles.row}>
              <Button
                label="Line up"
                disabled={ruler.line <= 0}
                onPress={() => setRulerLine(ruler.line - 1)}
              />
              <Button
                label="Line down"
                disabled={ruler.line >= ruler.lastLine}
                onPress={() => setRulerLine(ruler.line + 1)}
              />
              <Txt variant="caption" muted accessibilityLiveRegion="polite" style={{ alignSelf: "center" }}>
                Lines {ruler.line + 1}-{ruler.line + Math.min(RULER_LINES, ruler.lineCount)} of{" "}
                {ruler.lineCount}
              </Txt>
            </View>
          )}
          <Txt variant="caption" muted>
            Tap a sentence to listen from there
            {canShowOriginal ? ", or hold it to see the original wording" : ""}. Dates and times are
            marked in yellow and underlined, amounts in green.
          </Txt>

          <PlayerBar
            speech={speech}
            readingIndex={readingIndex}
            sentenceTexts={sentenceTexts}
            startIndex={settings.focusMode ? focusIndex : resumeIndex}
            continuing={!settings.focusMode && resumeIndex > 0}
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
  original: { borderRadius: 12, padding: 14, gap: 8 },
  dim: { position: "absolute", left: 0, right: 0 },
  player: { paddingTop: 14, gap: 12 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", borderWidth: 0 },
  fill: { height: "100%" },
});
