import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import { InputCard } from "./src/components/InputCard";
import { ReaderCard } from "./src/components/ReaderCard";
import { SummaryCard } from "./src/components/SummaryCard";
import { QuestionCard } from "./src/components/QuestionCard";
import { HistoryCard } from "./src/components/HistoryCard";
import { Txt } from "./src/components/ui";
import { useDocumentProcessor } from "./src/hooks/useDocumentProcessor";
import { useSettings } from "./src/hooks/useSettings";
import { useSpeech } from "./src/hooks/useSpeech";
import { useVoices } from "./src/hooks/useVoices";
import { SAMPLE_TEXT } from "./src/constants/sampleText";
import { runOcrFromImage, OCR_UNAVAILABLE_MESSAGE } from "./src/utils/ocr";
import { notify, confirmAsync } from "./src/utils/dialogs";
import { splitSentences } from "./src/utils/textProcessing";
import { exportDocumentSummary } from "./src/utils/storage";
import { error } from "./src/utils/logger";
import { THEMES, ThemeContext } from "./src/theme";

// Only the four faces the app uses; importing the packages' index files would
// bundle every weight and italic (~850 kB of unused fonts).
const FONT_FILES = {
  AtkinsonHyperlegible_400Regular: require("@expo-google-fonts/atkinson-hyperlegible/AtkinsonHyperlegible_400Regular.ttf"),
  AtkinsonHyperlegible_700Bold: require("@expo-google-fonts/atkinson-hyperlegible/AtkinsonHyperlegible_700Bold.ttf"),
  Lexend_400Regular: require("@expo-google-fonts/lexend/400Regular/Lexend_400Regular.ttf"),
  Lexend_700Bold: require("@expo-google-fonts/lexend/700Bold/Lexend_700Bold.ttf"),
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [inputText, setInputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState("simplified");
  const [focusIndex, setFocusIndex] = useState(0);
  const [settings, updateSettings, settingsLoaded] = useSettings();
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
  const voices = useVoices();
  // A saved voice that is no longer installed falls back to the device default.
  const voice = voices.some((v) => v.identifier === settings.voice) ? settings.voice : "";
  const speech = useSpeech(settings.ttsRate, voice);
  const theme = settings.highContrast ? THEMES.highContrast : THEMES.light;

  const scrollRef = useRef(null);
  const readerY = useRef(0);
  const scrollToReader = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, readerY.current - 12), animated: true });

  const viewText = activeDoc
    ? viewMode === "simplified"
      ? activeDoc.simplifiedText
      : activeDoc.rawText
    : "";
  // Sentence ranges of the text on screen: shared by highlighting, focus mode and speech.
  const sentences = useMemo(() => splitSentences(viewText), [viewText]);
  const readingIndex = speech.source === "document" ? speech.index : null;

  // What is spoken must match what is shown: stop and restart focus when the text changes.
  const { stop: stopSpeech } = speech;
  useEffect(() => {
    stopSpeech();
    setFocusIndex(0);
  }, [viewText, stopSpeech]);

  // Focus mode follows the sentence being read aloud.
  useEffect(() => {
    if (readingIndex !== null) setFocusIndex(readingIndex);
  }, [readingIndex]);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setProcessing(true);
    try {
      await processDocument(inputText);
      scrollToReader();
    } catch (err) {
      error("Error processing text:", err);
      notify("Couldn't save this text", "It's open in the reader, but it wasn't saved to your history.");
    } finally {
      setProcessing(false);
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

      setScanning(true);
      const ocr = await runOcrFromImage(result.assets?.[0]);
      if (ocr.status === "ok") {
        setInputText(ocr.text);
      } else if (ocr.status === "unavailable") {
        notify("Text scanning unavailable", OCR_UNAVAILABLE_MESSAGE);
      } else if (ocr.status === "empty") {
        notify("No text found", "Try a sharper photo with the text filling the frame.");
      } else {
        notify("Couldn't read the image", "Try again, or type the text instead.");
      }
    } catch (err) {
      error("Error getting image:", err);
      notify("Couldn't open the image", "Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleShare = async () => {
    const summary = exportDocumentSummary(activeDoc);
    try {
      await Share.share({ message: summary });
    } catch {
      // Web without navigator.share: fall back to the clipboard.
      try {
        await Clipboard.setStringAsync(summary);
        notify("Summary copied", "Sharing isn't available here, so the summary is on your clipboard.");
      } catch (err) {
        error("Error sharing summary:", err);
        notify("Couldn't share", "Please try again.");
      }
    }
  };

  const handleDelete = async (docId) => {
    const ok = await confirmAsync("Delete this text?", "It will be removed from your saved texts.", "Delete");
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
      "Delete all saved texts?",
      "Every saved text will be removed from this device. This can't be undone.",
      "Delete all"
    );
    if (!ok) return;
    try {
      await clearHistory();
    } catch (err) {
      error("Error clearing history:", err);
      notify("Couldn't delete", "Please try again.");
    }
  };

  const handleOpen = (docId) => {
    loadDocument(docId);
    scrollToReader();
  };

  // Wait for the fonts and the saved settings so nobody sees the defaults flash by.
  if ((!fontsLoaded && !fontError) || !settingsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.page }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.page }} edges={["top", "left", "right"]}>
          <StatusBar style="dark" />
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.column}>
              <View style={styles.header}>
                <Txt variant="title" accessibilityRole="header">
                  ReadAble
                </Txt>
                <Txt muted>
                  Scan or paste text, read it in a calmer layout, listen to it, and ask about it.
                  Nothing leaves your device.
                </Txt>
              </View>

              <InputCard
                text={inputText}
                onChangeText={setInputText}
                onScan={() => handleImage("camera")}
                onPickImage={() => handleImage("library")}
                onUseSample={() => setInputText(SAMPLE_TEXT)}
                onSubmit={handleProcess}
                scanning={scanning}
                processing={processing}
              />

              <ReaderCard
                doc={activeDoc}
                text={viewText}
                sentences={sentences}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                settings={settings}
                onSettingsChange={updateSettings}
                speech={speech}
                voices={voices}
                readingIndex={readingIndex}
                focusIndex={Math.min(focusIndex, Math.max(0, sentences.length - 1))}
                onFocusIndexChange={setFocusIndex}
                onLayout={(e) => {
                  readerY.current = e.nativeEvent.layout.y;
                }}
              />

              <SummaryCard doc={activeDoc} onShare={handleShare} />

              <QuestionCard docId={activeDoc?.id} ask={runQuestion} speech={speech} />

              <HistoryCard
                history={history}
                activeId={activeDoc?.id}
                loading={loading}
                error={historyError}
                onOpen={handleOpen}
                onDelete={handleDelete}
                onClearAll={handleClearAll}
                onRetry={retryLoadHistory}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 48 },
  column: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 16 },
  header: { gap: 6, paddingVertical: 8 },
});
