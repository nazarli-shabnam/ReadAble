import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  useFonts,
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible";
import * as ImagePicker from "expo-image-picker";
import { AccessibilityControls } from "./src/components/AccessibilityControls";
import { HighlightedText } from "./src/components/HighlightedText";
import { useDocumentProcessor } from "./src/hooks/useDocumentProcessor";
import { useSpeech } from "./src/hooks/useSpeech";
import { SAMPLE_TEXT } from "./src/constants/sampleText";
import { runOcrFromImage, OCR_UNAVAILABLE_MESSAGE } from "./src/utils/ocr";
import { notify, confirmAsync } from "./src/utils/dialogs";
import { splitSentences } from "./src/utils/textProcessing";
import { exportDocumentSummary } from "./src/utils/storage";
import { useSettings } from "./src/hooks/useSettings";
import { error } from "./src/utils/logger";

const toRgba = (hex, opacity) => {
  if (!hex?.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  const [inputText, setInputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState("simplified");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerConfidence, setAnswerConfidence] = useState(0);
  const [answerSource, setAnswerSource] = useState(null);
  const [focusLineIndex, setFocusLineIndex] = useState(0);
  const [settings, updateSettings] = useSettings();
  const {
    highContrast,
    fontSize: fontScale,
    letterSpacing,
    overlayEnabled,
    overlayColor,
    overlayOpacity,
    fontFamily: selectedFont,
    focusMode,
    ttsRate,
  } = settings;
  const lineHeight = Math.round(fontScale * settings.lineSpacing);
  const {
    activeDoc,
    history,
    loading,
    historyError,
    processDocument,
    loadDocument,
    removeDocument,
    clearHistory,
    retryLoadHistory,
    runQuestion,
  } = useDocumentProcessor();
  const speech = useSpeech(ttsRate);

  const handleProcess = async () => {
    if (!inputText.trim()) {
      notify("Nothing to process", "Type, paste or scan some text first.");
      return;
    }
    setProcessing(true);
    try {
      const doc = await processDocument(inputText);
      if (doc) {
        setAnswer("");
      } else {
        notify("Couldn't process text", "Please try again.");
      }
    } catch (err) {
      error("Error in handleProcess:", err);
      notify("Couldn't process text", err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuestion = () => {
    try {
      if (!question.trim() || !activeDoc) return;
      const result = runQuestion(question);
      setAnswer(
        result.found
          ? result.answer
          : "I couldn't find that in this document. Try asking with other words."
      );
      setAnswerConfidence(result.confidence || 0);
      setAnswerSource(result.source || null);
    } catch (err) {
      error("Error in handleQuestion:", err);
      notify("Couldn't answer", err.message);
    }
  };


  const handleLoadDocument = (docId) => {
    loadDocument(docId);
    setAnswer("");
  };

  const handleExport = async () => {
    if (!activeDoc) return;
    try {
      const summary = exportDocumentSummary(activeDoc);
      try {
        await Share.share({ message: summary });
      } catch {
        // Web without navigator.share: fall back to the clipboard
        await Clipboard.setStringAsync(summary);
        notify("Copied", "Sharing isn't available here, so the summary was copied to your clipboard.");
      }
    } catch (err) {
      error("Error exporting summary:", err);
      notify("Export failed", "Unable to share the summary right now.");
    }
  };

  const handleDelete = async (docId) => {
    const ok = await confirmAsync(
      "Delete document?",
      "This removes it from your history.",
      "Delete"
    );
    if (!ok) return;
    try {
      await removeDocument(docId);
    } catch (err) {
      error("Error deleting document:", err);
      notify("Couldn't delete", "Please try again.");
    }
  };

  const handleClearAll = async () => {
    const ok = await confirmAsync(
      "Clear all history?",
      "Every saved document will be removed. This cannot be undone.",
      "Clear all"
    );
    if (!ok) return;
    try {
      await clearHistory();
    } catch (err) {
      error("Error clearing history:", err);
      notify("Couldn't clear history", "Please try again.");
    }
  };

  // Shared by camera and gallery: ask permission, get an image, run OCR.
  const handleImage = async (source) => {
    const fromCamera = source === "camera";
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify(
          "Permission needed",
          `Allow access to your ${fromCamera ? "camera" : "photos"} in Settings to scan text.`
        );
        return;
      }
      const options = { mediaTypes: ["images"], quality: 1 };
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;

      const ocr = await runOcrFromImage(result.assets?.[0]);
      if (ocr.status === "ok") {
        setInputText(ocr.text);
      } else if (ocr.status === "unavailable") {
        notify("Text scanning unavailable", OCR_UNAVAILABLE_MESSAGE);
      } else if (ocr.status === "empty") {
        notify("No text found", "Try a sharper photo with the text filling the frame.");
      } else {
        notify("Couldn't read the image", "Please try again or type the text instead.");
      }
    } catch (err) {
      error("Error getting image:", err);
      notify("Couldn't open the image", "Please try again.");
    }
  };

  const viewText = activeDoc
    ? viewMode === "simplified"
      ? activeDoc.simplifiedText
      : activeDoc.rawText
    : "";
  // Sentence ranges of the text on screen; shared by the reader and focus mode.
  const activeSentences = useMemo(() => splitSentences(viewText), [viewText]);

  const readingAloud = speech.source === "document" ? speech.index : null;

  // What is spoken must match what is highlighted: stop when the text changes.
  const { stop: stopSpeech } = speech;
  useEffect(() => {
    stopSpeech();
  }, [viewText, stopSpeech]);

  const handlePlayPause = () => {
    if (speech.status === "speaking") speech.pause();
    else if (speech.status === "paused") speech.resume();
    else speech.play(activeSentences.map((s) => s.text));
  };

  // Reset focus line index when document or focus mode changes
  useEffect(() => {
    if (focusMode && activeDoc) {
      setFocusLineIndex(0);
    } else if (!activeDoc) {
      setFocusLineIndex(0);
    }
  }, [activeDoc?.id, focusMode]); // Only depend on doc ID, not entire object

  // Validate focusLineIndex bounds when activeSentences change
  useEffect(() => {
    if (!focusMode) return;
    if (activeSentences.length === 0 || focusLineIndex >= activeSentences.length) {
      setFocusLineIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSentences.length, focusMode]); // focusLineIndex intentionally omitted to prevent loop

  const overlayStyle = {
    padding: 12,
    borderRadius: 8,
    width: "100%",
    ...(overlayEnabled && {
      backgroundColor: toRgba(overlayColor, overlayOpacity),
    }),
  };

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, highContrast && styles.safeHighContrast]}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Multimodal Reading Aid</Text>
            <Text style={styles.subtitle}>
              Capture text, simplify it, hear it aloud, and ask questions.
              Everything stays on your device.
            </Text>
          </View>
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <Text
            style={[styles.sectionTitle, highContrast && { color: "#000" }]}
          >
            1) Add text
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleImage("camera")}
            >
              <Text style={styles.buttonText}>Capture with camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => handleImage("library")}>
              <Text style={styles.buttonText}>Pick image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setInputText(SAMPLE_TEXT)}
            >
              <Text style={styles.secondaryButtonText}>Use sample</Text>
            </TouchableOpacity>
          </View>
          <View style={{ position: "relative" }}>
            <TextInput
              multiline
              placeholder="Paste or type text; OCR wire-up coming from ML Kit / Apple Vision."
              value={inputText}
              onChangeText={setInputText}
              style={styles.textArea}
            />
            {inputText.length > 0 && (
              <TouchableOpacity
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  padding: 6,
                  backgroundColor: "#ef4444",
                  borderRadius: 6,
                }}
                onPress={() => setInputText("")}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleProcess}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Process</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <Text
            style={[styles.sectionTitle, highContrast && { color: "#000" }]}
          >
            2) Dyslexia-friendly reader
          </Text>
          <AccessibilityControls settings={settings} onChange={updateSettings} />
          {activeDoc ? (
            <View>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    viewMode === "simplified" && styles.chipActive,
                  ]}
                  onPress={() => setViewMode("simplified")}
                >
                  <Text style={styles.chipText}>Simplified</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    viewMode === "original" && styles.chipActive,
                  ]}
                  onPress={() => setViewMode("original")}
                >
                  <Text style={styles.chipText}>Original</Text>
                </TouchableOpacity>
              </View>
              <View style={overlayStyle}>
                {focusMode && activeSentences.length > 0 ? (
                  <View>
                    <View
                      style={{ flexDirection: "row", marginBottom: 8, gap: 8 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.secondaryButton,
                          focusLineIndex === 0 && styles.buttonDisabled,
                        ]}
                        onPress={() =>
                          setFocusLineIndex(Math.max(0, focusLineIndex - 1))
                        }
                        disabled={focusLineIndex === 0}
                      >
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            focusLineIndex === 0 && styles.buttonDisabledText,
                          ]}
                        >
                          ↑ Prev
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.caption,
                          { flex: 1, textAlign: "center" },
                        ]}
                      >
                        Line {focusLineIndex + 1} of {activeSentences.length}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.secondaryButton,
                          focusLineIndex >= activeSentences.length - 1 &&
                            styles.buttonDisabled,
                        ]}
                        onPress={() =>
                          setFocusLineIndex(
                            Math.min(
                              activeSentences.length - 1,
                              focusLineIndex + 1
                            )
                          )
                        }
                        disabled={focusLineIndex >= activeSentences.length - 1}
                      >
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            focusLineIndex >= activeSentences.length - 1 &&
                              styles.buttonDisabledText,
                          ]}
                        >
                          Next ↓
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <HighlightedText
                      text={activeSentences[focusLineIndex]?.text || ""}
                      highContrast={highContrast}
                      style={{
                        fontSize: fontScale,
                        lineHeight,
                        letterSpacing,
                        color: highContrast ? "#000000" : "#222",
                        fontFamily:
                          selectedFont === "atkinson"
                            ? "AtkinsonHyperlegible_400Regular"
                            : undefined,
                      }}
                      highlightStyle={{
                        fontWeight: "700",
                        fontFamily:
                          selectedFont === "atkinson"
                            ? "AtkinsonHyperlegible_700Bold"
                            : undefined,
                        color: highContrast ? "#000000" : undefined,
                      }}
                    />
                  </View>
                ) : (
                  <HighlightedText
                    text={viewText}
                    sentences={activeSentences}
                    activeSentenceIndex={readingAloud}
                    highContrast={highContrast}
                    style={{
                      fontSize: fontScale,
                      lineHeight,
                      letterSpacing,
                      color: highContrast ? "#000000" : "#222",
                      fontFamily:
                        selectedFont === "atkinson"
                          ? "AtkinsonHyperlegible_400Regular"
                          : undefined,
                    }}
                    highlightStyle={{
                      fontWeight: "700",
                      fontFamily:
                        selectedFont === "atkinson"
                          ? "AtkinsonHyperlegible_700Bold"
                          : undefined,
                      color: highContrast ? "#000000" : undefined,
                    }}
                  />
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.placeholder}>
              Processed text will show here.
            </Text>
          )}
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <Text
            style={[styles.sectionTitle, highContrast && { color: "#000" }]}
          >
            3) Summary
          </Text>
          {activeDoc?.summary ? (
            <>
              <Text style={[styles.body, highContrast && { color: "#000" }]}>
                {activeDoc.summary}
              </Text>
              {activeDoc.rawText && (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 16,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: highContrast ? "#000" : "#e5e7eb",
                  }}
                >
                  <Text
                    style={[
                      styles.placeholder,
                      { fontSize: 12 },
                      highContrast && { color: "#000" },
                    ]}
                  >
                    📊 Words:{" "}
                    {activeDoc.rawText.split(/\s+/).filter(Boolean).length}
                  </Text>
                  <Text
                    style={[
                      styles.placeholder,
                      { fontSize: 12 },
                      highContrast && { color: "#000" },
                    ]}
                  >
                    ⏱️ Reading time:{" "}
                    {Math.ceil(
                      activeDoc.rawText.split(/\s+/).filter(Boolean).length /
                        200
                    )}{" "}
                    min
                  </Text>
                  <Text
                    style={[
                      styles.placeholder,
                      { fontSize: 12 },
                      highContrast && { color: "#000" },
                    ]}
                  >
                    📝 Sentences: {activeDoc.sentences?.length || 0}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text
              style={[styles.placeholder, highContrast && { color: "#000" }]}
            >
              No summary yet.
            </Text>
          )}
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <Text
            style={[styles.sectionTitle, highContrast && { color: "#000" }]}
          >
            4) Ask a question
          </Text>
          <TextInput
            placeholder="e.g., When is the due date?"
            value={question}
            onChangeText={setQuestion}
            style={styles.input}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (!activeDoc || !question.trim()) && styles.buttonDisabled,
            ]}
            onPress={handleQuestion}
            disabled={!activeDoc || !question.trim()}
          >
            <Text style={styles.buttonText}>Get answer</Text>
          </TouchableOpacity>
          {answer ? (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={[styles.body, highContrast && { color: "#000" }]}>
                  {answer}
                </Text>
                <TouchableOpacity
                  style={{
                    padding: 8,
                    backgroundColor: "#e0e7ff",
                    borderRadius: 6,
                    marginLeft: 8,
                  }}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(answer);
                      notify("Copied", "Answer copied to clipboard.");
                    } catch (err) {
                      error("Clipboard error", err);
                      notify("Copy failed", "Could not copy to clipboard.");
                    }
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600" }}>Copy</Text>
                </TouchableOpacity>
              </View>
              {answerConfidence > 0 && (
                <Text
                  style={[
                    styles.placeholder,
                    { marginTop: 8, fontSize: 12 },
                    highContrast && { color: "#000" },
                  ]}
                >
                  Confidence: {answerConfidence}%
                  {answerSource?.sentenceIndex !== undefined &&
                    ` (from sentence ${answerSource.sentenceIndex + 1})`}
                </Text>
              )}
            </View>
          ) : (
            <Text
              style={[styles.placeholder, highContrast && { color: "#000" }]}
            >
              Answer will appear here.
            </Text>
          )}
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <Text
            style={[styles.sectionTitle, highContrast && { color: "#000" }]}
          >
            5) Listen
          </Text>
          {readingAloud !== null && (
            <Text style={styles.caption} accessibilityLiveRegion="polite">
              {speech.status === "paused" ? "Paused at" : "Reading"} sentence{" "}
              {readingAloud + 1} of {speech.total}
            </Text>
          )}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, !activeDoc && styles.buttonDisabled]}
              onPress={handlePlayPause}
              disabled={!activeDoc}
            >
              <Text style={styles.buttonText}>
                {speech.status === "speaking"
                  ? "Pause"
                  : speech.status === "paused"
                  ? "Resume"
                  : "Play"}
              </Text>
            </TouchableOpacity>
            {speech.status !== "idle" && (
              <>
                <TouchableOpacity style={styles.secondaryButton} onPress={speech.prev}>
                  <Text style={styles.secondaryButtonText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={speech.next}>
                  <Text style={styles.secondaryButtonText}>Next</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={speech.stop}>
                  <Text style={styles.secondaryButtonText}>Stop</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={[styles.card, highContrast && styles.cardHighContrast]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={[styles.sectionTitle, highContrast && { color: "#000" }]}
            >
              6) History & Export
            </Text>
            {history.length > 0 && (
              <TouchableOpacity
                style={{
                  padding: 6,
                  backgroundColor: "#ef4444",
                  borderRadius: 6,
                }}
                onPress={handleClearAll}
              >
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {activeDoc && (
            <TouchableOpacity style={styles.button} onPress={handleExport}>
              <Text style={styles.buttonText}>Export Summary</Text>
            </TouchableOpacity>
          )}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : historyError ? (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: "#fee2e2", borderRadius: 8 }}>
              <Text style={{ color: "#dc2626", marginBottom: 8, fontWeight: "600" }}>
                ⚠️ {historyError}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.button, { flex: 1 }]}
                  onPress={retryLoadHistory}
                >
                  <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { flex: 1 }]}
                  onPress={handleClearAll}
                >
                  <Text style={styles.secondaryButtonText}>Clear Storage</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : history.length > 0 ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              {history.slice(0, 5).map((doc) => (
                <View
                  key={doc.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 10,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 8,
                  }}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => handleLoadDocument(doc.id)}
                  >
                    <Text
                      style={[
                        styles.body,
                        {
                          fontSize: 13,
                          color:
                            activeDoc?.id === doc.id ? "#111827" : "#6b7280",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {doc.rawText}
                    </Text>
                    <Text style={[styles.placeholder, { fontSize: 11 }]}>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(doc.id)}
                    style={{
                      padding: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: "#dc2626", fontWeight: "600" }}>
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.placeholder}>No history yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7fb" },
  safeHighContrast: { backgroundColor: "#ffffff" },
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
    fontFamily: "AtkinsonHyperlegible_700Bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
    fontFamily: "AtkinsonHyperlegible_400Regular",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHighContrast: {
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  button: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.5,
  },
  buttonDisabledText: {
    color: "#6b7280",
    opacity: 0.7,
  },
  secondaryButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryButtonText: { color: "#111827", fontWeight: "700" },
  textArea: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 10,
    minHeight: 120,
    marginVertical: 10,
    textAlignVertical: "top",
  },
  input: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#c7d2fe" },
  chipText: { fontWeight: "600" },
  body: {
    fontSize: 15,
    color: "#111",
    lineHeight: 22,
    fontFamily: "AtkinsonHyperlegible_400Regular",
  },
  placeholder: { color: "#6b7280" },
  caption: {
    color: "#4b5563",
    marginBottom: 6,
    fontFamily: "AtkinsonHyperlegible_400Regular",
  },
});
