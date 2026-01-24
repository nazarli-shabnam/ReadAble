import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
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
import { SAMPLE_TEXT } from "./src/constants/sampleText";
import { runOcrFromImage } from "./src/utils/ocr";
import { splitSentences } from "./src/utils/textProcessing";
import {
  exportDocumentSummary,
  deleteDocument,
  clearAllDocuments,
  getOfflineMode,
  setOfflineMode,
} from "./src/utils/storage";
import * as Sharing from "expo-sharing";

const toRgba = (hex, opacity) => {
  if (!hex?.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function App() {
  const [fontsLoaded] = useFonts({
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
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState(18);
  const [lineHeight, setLineHeight] = useState(24);
  const [letterSpacing, setLetterSpacing] = useState(0.2);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayColor, setOverlayColor] = useState("#fef3c7");
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [selectedFont, setSelectedFont] = useState("atkinson");
  const [focusMode, setFocusMode] = useState(false);
  const [focusLineIndex, setFocusLineIndex] = useState(0);
  const [offlineMode, setOfflineModeState] = useState(true);
  const [ttsRate, setTtsRate] = useState(1.0);
  const {
    activeDoc,
    history,
    loading,
    processDocument,
    loadDocument,
    refreshDocuments,
    runQuestion,
    speak,
    pauseSpeaking,
    resumeSpeaking,
    seekToSentence,
    stopSpeaking,
    ttsState,
  } = useDocumentProcessor();

  const handleProcess = async () => {
    if (!inputText.trim()) {
      alert("Please enter some text to process");
      return;
    }
    setProcessing(true);
    try {
      const doc = await processDocument(inputText);
      if (doc) {
        setAnswer("");
      } else {
        alert("Failed to process document. Check console for errors.");
      }
    } catch (error) {
      console.error("Error in handleProcess:", error);
      alert("Error processing document: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuestion = () => {
    try {
      if (!question.trim()) {
        alert("Please enter a question");
        return;
      }
      if (!activeDoc) {
        alert("Please process a document first");
        return;
      }
      const result = runQuestion(question);
      setAnswer(result.answer || "");
      setAnswerConfidence(result.confidence || 0);
      setAnswerSource(result.source || null);
    } catch (error) {
      console.error("Error in handleQuestion:", error);
      alert("Error getting answer: " + error.message);
    }
  };

  const handleStop = () => stopSpeaking();
  const handlePause = () => pauseSpeaking();
  const handleResume = () => resumeSpeaking(activeDoc, viewMode, ttsRate);
  const handleSpeak = () => speak(activeDoc, viewMode, 0, ttsRate);

  const handleLoadDocument = async (docId) => {
    await loadDocument(docId);
    setAnswer("");
  };

  const handleExport = async () => {
    if (!activeDoc) return;
    try {
      const summary = exportDocumentSummary(activeDoc);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync({
          message: summary,
          mimeType: "text/plain",
        });
      } else {
        Alert.alert("Sharing unavailable", "Native sharing is not available.");
      }
    } catch (error) {
      console.error("Error exporting summary:", error);
      Alert.alert("Export failed", "Unable to share summary right now.");
    }
  };

  const handleDelete = async (docId) => {
    await deleteDocument(docId);
    await refreshDocuments();
  };

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        alert("Permission to access photos is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!result.canceled) {
        const image = result.assets?.[0];
        if (!image?.uri) {
          alert("Invalid image selected. Please try again.");
          return;
        }
        try {
          const ocr = await runOcrFromImage(image);
          if (ocr.meta?.provider === "stub") {
            alert(
              "OCR is not available in Expo Go.\n\n" +
                "To use OCR features:\n" +
                "1. Build a custom development client:\n" +
                "   npx expo prebuild\n" +
                "   npx expo run:ios (or run:android)\n\n" +
                "2. Or manually type/paste text in the input field.\n\n" +
                "The image was selected, but OCR text extraction requires native modules."
            );
            return;
          }
          setInputText(ocr.text || "");
        } catch (ocrError) {
          console.error("OCR error:", ocrError);
          alert(
            "Failed to extract text from image. Please try again or type manually."
          );
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image. Please try again.");
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access camera is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled) {
        const image = result.assets?.[0];
        if (!image?.uri) {
          alert("Invalid image captured. Please try again.");
          return;
        }
        try {
          const ocr = await runOcrFromImage(image);
          if (ocr.meta?.provider === "stub") {
            alert(
              "OCR is not available in Expo Go.\n\n" +
                "To use OCR features:\n" +
                "1. Build a custom development client:\n" +
                "   npx expo prebuild\n" +
                "   npx expo run:ios (or run:android)\n\n" +
                "2. Or manually type/paste text in the input field.\n\n" +
                "The photo was captured, but OCR text extraction requires native modules."
            );
            // Don't set the error message as text - let user type manually
            return;
          }
          setInputText(ocr.text || "");
        } catch (ocrError) {
          console.error("OCR error:", ocrError);
          alert(
            "Failed to extract text from image. Please try again or type manually."
          );
        }
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      alert("Failed to capture image. Please try again.");
    }
  };

  const activeSentences = useMemo(() => {
    if (!activeDoc) return [];
    return viewMode === "simplified"
      ? splitSentences(activeDoc.simplifiedText)
      : activeDoc.sentences?.length
      ? activeDoc.sentences
      : splitSentences(activeDoc.rawText);
  }, [activeDoc, viewMode]);

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
    if (focusMode && activeSentences.length > 0 && focusLineIndex >= activeSentences.length) {
      setFocusLineIndex(0);
    } else if (focusMode && activeSentences.length === 0) {
      setFocusLineIndex(0);
    }
  }, [activeSentences.length, focusMode, focusLineIndex]);

  const overlayStyle = {
    padding: 12,
    borderRadius: 8,
    width: "100%",
    ...(overlayEnabled && {
      backgroundColor: toRgba(overlayColor, overlayOpacity),
    }),
  };

  if (!fontsLoaded) {
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
              Offline-friendly by design.
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
              onPress={handleCameraCapture}
            >
              <Text style={styles.buttonText}>Capture with camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handlePickImage}>
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
          <AccessibilityControls
            highContrast={highContrast}
            onToggleContrast={() => setHighContrast((v) => !v)}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            lineHeight={lineHeight}
            onLineHeightChange={setLineHeight}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={setLetterSpacing}
            overlayEnabled={overlayEnabled}
            onToggleOverlay={() => setOverlayEnabled((v) => !v)}
            overlayColor={overlayColor}
            onOverlayColorChange={setOverlayColor}
            overlayOpacity={overlayOpacity}
            onOverlayOpacityChange={setOverlayOpacity}
            selectedFont={selectedFont}
            onFontChange={setSelectedFont}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode((v) => !v)}
            ttsRate={ttsRate}
            onTtsRateChange={setTtsRate}
          />
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
                        style={styles.secondaryButton}
                        onPress={() =>
                          setFocusLineIndex(Math.max(0, focusLineIndex - 1))
                        }
                        disabled={focusLineIndex === 0}
                      >
                        <Text style={styles.secondaryButtonText}>↑ Prev</Text>
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
                        style={styles.secondaryButton}
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
                        <Text style={styles.secondaryButtonText}>Next ↓</Text>
                      </TouchableOpacity>
                    </View>
                    <HighlightedText
                      text={activeSentences[focusLineIndex] || ""}
                      dates={activeDoc.highlights?.dates}
                      amounts={activeDoc.highlights?.amounts}
                      sentences={[activeSentences[focusLineIndex] || ""]}
                      activeSentenceIndex={0}
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
                    text={
                      viewMode === "simplified"
                        ? activeDoc.simplifiedText
                        : activeDoc.rawText
                    }
                    dates={activeDoc.highlights?.dates}
                    amounts={activeDoc.highlights?.amounts}
                    sentences={activeSentences}
                    activeSentenceIndex={ttsState.sentenceIndex}
                    sentenceRanges={
                      viewMode === "original" && activeDoc.sentenceRanges
                        ? activeDoc.sentenceRanges
                        : null
                    }
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
                      Alert.alert("Copied", "Answer copied to clipboard!");
                    } catch (err) {
                      console.error("Clipboard error", err);
                      Alert.alert(
                        "Copy failed",
                        "Could not copy to clipboard. Please try again."
                      );
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
          {ttsState.speaking && (
            <Text style={styles.caption}>
              Speaking sentence {Math.max(1, (ttsState.sentenceIndex ?? 0) + 1)}{" "}
              of {ttsState.totalSentences || "—"}
            </Text>
          )}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (ttsState.paused) {
                  resumeSpeaking(activeDoc, viewMode, ttsRate);
                } else {
                  handleSpeak();
                }
              }}
              disabled={!activeDoc}
            >
              <Text style={styles.buttonText}>
                {ttsState.speaking
                  ? "Speaking…"
                  : ttsState.paused
                  ? "Resume"
                  : "Play TTS"}
              </Text>
            </TouchableOpacity>
            {ttsState.speaking && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={pauseSpeaking}
              >
                <Text style={styles.secondaryButtonText}>Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleStop}
            >
              <Text style={styles.secondaryButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
          {ttsState.totalSentences > 0 && (
            <View
              style={{
                marginTop: 8,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {Array.from({
                length: Math.min(ttsState.totalSentences, 10),
              }).map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() =>
                    seekToSentence(activeDoc, viewMode, i, ttsRate)
                  }
                  style={{
                    padding: 4,
                    paddingHorizontal: 8,
                    backgroundColor:
                      i === ttsState.sentenceIndex ? "#c7d2fe" : "#e5e7eb",
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{i + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
                onPress={() => {
                  Alert.alert(
                    "Clear All History",
                    "Are you sure you want to clear all history? This cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Clear All",
                        style: "destructive",
                        onPress: async () => {
                          await clearAllDocuments();
                          await refreshDocuments();
                          Alert.alert("Success", "All history cleared.");
                        },
                      },
                    ]
                  );
                }}
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
                      {doc.summary || doc.rawText.slice(0, 50)}...
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
    opacity: 0.6,
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
