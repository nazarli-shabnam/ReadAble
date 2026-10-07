import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
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
import { useReadingPosition } from "./src/hooks/useReadingPosition";
import { useVoices } from "./src/hooks/useVoices";
import { SAMPLE_TEXT } from "./src/constants/sampleText";
import { runOcrFromImage, OCR_UNAVAILABLE_MESSAGE } from "./src/utils/ocr";
import { appendScan } from "./src/utils/ocrText";
import { pickTextFile } from "./src/utils/importText";
import { notify, confirmAsync } from "./src/utils/dialogs";
import { splitSentences } from "./src/utils/textProcessing";
import { exportDocumentSummary, MAX_PINNED } from "./src/utils/storage";
import { shareOrCopy } from "./src/utils/share";
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
  const [focusIndex, setFocusIndex] = useState(0);
  // Sentence of the original text that a Q&A answer came from, marked in the reader.
  const [markedIndex, setMarkedIndex] = useState(null);
  const pendingFocus = useRef(null);
  const [settings, updateSettings, settingsLoaded] = useSettings();
  // The Simplified/Original choice is a saved preference like the rest.
  const viewMode = settings.viewMode;
  const setViewMode = (mode) => updateSettings({ viewMode: mode });
  const {
    activeDoc,
    history,
    loading,
    historyError,
    processDocument,
    loadDocument,
    removeDocument,
    clearHistory,
    updateMeta,
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

  // Where the reader got to in this text (saved per text, mapped onto the version shown).
  const { resumeIndex, loadedFor, remember } = useReadingPosition(activeDoc?.id, sentences.length);
  const resumeRef = useRef(0);
  resumeRef.current = resumeIndex;
  const lastReadRef = useRef(null);

  // What is spoken must match what is shown: stop, and put focus mode back where the reader was.
  const { stop: stopSpeech } = speech;
  useEffect(() => {
    stopSpeech();
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    setFocusIndex(pending ?? (loadedFor === activeDoc?.id ? resumeRef.current : 0));
    if (pending === null) setMarkedIndex(null);
  }, [viewText, stopSpeech]);

  // The saved position arrives after the text opens.
  useEffect(() => {
    if (loadedFor && loadedFor === activeDoc?.id) setFocusIndex(resumeRef.current);
  }, [loadedFor]);

  // Remember the sentence being read; reading to the end starts the text over.
  useEffect(() => {
    if (readingIndex !== null) {
      lastReadRef.current = readingIndex;
      remember(readingIndex);
    } else {
      if (lastReadRef.current !== null && lastReadRef.current === sentences.length - 1) remember(0);
      lastReadRef.current = null;
    }
  }, [readingIndex]);

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
        setInputText((current) => appendScan(current, ocr.text));
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

  const handleFile = async () => {
    const file = await pickTextFile();
    if (file.status === "ok") setInputText((current) => appendScan(current, file.text));
    else if (file.status === "empty") notify("Nothing to read", "That file has no text in it.");
    else if (file.status === "tooLarge") {
      notify("File too large", "Choose a text file smaller than 1 MB, or paste part of it.");
    } else if (file.status === "error") {
      notify("Couldn't open the file", "Choose a plain text (.txt) file, or paste the text instead.");
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareOrCopy(exportDocumentSummary(activeDoc));
      if (result === "copied") {
        notify("Summary copied", "Sharing isn't available here, so the summary is on your clipboard.");
      }
    } catch (err) {
      error("Error sharing summary:", err);
      notify("Couldn't share", "Please try again.");
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

  const handleUpdateMeta = async (docId, meta) => {
    try {
      const ok = await updateMeta(docId, meta);
      if (!ok && meta.pinned) {
        notify("Too many pinned texts", `You can pin up to ${MAX_PINNED} texts. Unpin one first.`);
      }
    } catch (err) {
      error("Error updating saved text:", err);
      notify("Couldn't save the change", "Please try again.");
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

  // Answers come from the original text, so show that version with the sentence marked.
  const handleShowAnswer = (index) => {
    if (viewMode === "original") {
      setFocusIndex(index);
    } else {
      pendingFocus.current = index;
      setViewMode("original");
    }
    setMarkedIndex(index);
    scrollToReader();
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
                onPickFile={handleFile}
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
                markedIndex={markedIndex}
                focusIndex={Math.min(focusIndex, Math.max(0, sentences.length - 1))}
                resumeIndex={resumeIndex}
                onFocusIndexChange={(index) => {
                  setFocusIndex(index);
                  if (settings.focusMode) remember(index);
                }}
                onLayout={(e) => {
                  readerY.current = e.nativeEvent.layout.y;
                }}
              />

              <SummaryCard doc={activeDoc} onShare={handleShare} />

              <QuestionCard docId={activeDoc?.id} ask={runQuestion} speech={speech} onShow={handleShowAnswer} />

              <HistoryCard
                history={history}
                activeId={activeDoc?.id}
                loading={loading}
                error={historyError}
                onOpen={handleOpen}
                onDelete={handleDelete}
                onUpdateMeta={handleUpdateMeta}
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
