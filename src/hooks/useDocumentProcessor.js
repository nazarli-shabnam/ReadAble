import { useCallback, useEffect, useState, useRef } from "react";
import * as Speech from "expo-speech";
import {
  buildDocument,
  answerQuestion,
  splitSentences,
} from "../utils/textProcessing";
import { loadDocuments, saveDocument } from "../utils/storage";

export const useDocumentProcessor = () => {
  const [history, setHistory] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ttsState, setTtsState] = useState({
    speaking: false,
    paused: false,
    lastText: "",
    sentenceIndex: null,
    totalSentences: 0,
    segments: [],
  });
  const [currentSpeechId, setCurrentSpeechId] = useState(null);
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);
  const sentenceIndexRef = useRef(null);
  const ttsOperationInProgressRef = useRef(false); // Prevent race conditions

  useEffect(() => {
    const load = async () => {
      const docs = await loadDocuments();
      setHistory(docs);
      if (docs.length > 0) {
        setActiveDoc(docs[0]);
      }
      setLoading(false);
    };
    load();
    return () => {
      // Stop any active speech when unmounting to avoid background playback
      shouldStopRef.current = true;
      isPausedRef.current = false;
      Speech.stop();
      sentenceIndexRef.current = null;
    };
  }, []);

  // Cleanup TTS when activeDoc changes
  useEffect(() => {
    return () => {
      // Stop TTS when document changes
      shouldStopRef.current = true;
      isPausedRef.current = false;
      ttsOperationInProgressRef.current = false;
      Speech.stop();
      sentenceIndexRef.current = null;
      setTtsState({
        speaking: false,
        paused: false,
        lastText: "",
        sentenceIndex: null,
        totalSentences: 0,
        segments: [],
      });
    };
  }, [activeDoc]);

  const processDocument = useCallback(async (text) => {
    try {
      if (!text || !text.trim()) {
        console.warn("processDocument: Empty text provided");
        return null;
      }
      const doc = buildDocument(text);
      if (!doc || !doc.rawText) {
        console.error("processDocument: Failed to build document", doc);
        return null;
      }
      console.log("processDocument: Document created", {
        id: doc.id,
        sentences: doc.sentences?.length,
        summary: doc.summary?.substring(0, 50),
      });
      setActiveDoc(doc);
      await saveDocument(doc);
      const updated = await loadDocuments();
      setHistory(updated);
      return doc;
    } catch (error) {
      console.error("processDocument error:", error);
      throw error;
    }
  }, []);

  const loadDocument = useCallback(async (docId) => {
    const docs = await loadDocuments();
    const doc = docs.find((d) => d.id === docId);
    if (doc) {
      setActiveDoc(doc);
    }
    return doc;
  }, []);

  const refreshDocuments = useCallback(async () => {
    const docs = await loadDocuments();
    setHistory(docs);
    if (activeDoc && !docs.find((d) => d.id === activeDoc.id)) {
      setActiveDoc(docs[0] || null);
    }
  }, [activeDoc]);

  const runQuestion = useCallback(
    (question) => {
      if (!question || !activeDoc)
        return { answer: "", confidence: 0, source: null };
      return answerQuestion(question, activeDoc);
    },
    [activeDoc]
  );

  const speak = useCallback(
    (doc, mode = "simplified", startIndex = 0, rate = 1.0) => {
      if (!doc) return;

      // Prevent race conditions - if operation in progress, stop current and proceed
      if (ttsOperationInProgressRef.current) {
        Speech.stop();
      }
      ttsOperationInProgressRef.current = true;

      const sentenceList =
        mode === "simplified"
          ? splitSentences(doc.simplifiedText)
          : doc.sentences?.length
          ? doc.sentences
          : splitSentences(doc.rawText);
      const segments = sentenceList.length
        ? sentenceList
        : [mode === "simplified" ? doc.simplifiedText : doc.rawText];

      Speech.stop();
      isPausedRef.current = false;
      shouldStopRef.current = false;

      let idx = Math.max(0, startIndex);
      const speakNext = () => {
        if (shouldStopRef.current) {
          ttsOperationInProgressRef.current = false;
          setTtsState({
            speaking: false,
            paused: false,
            lastText: "",
            sentenceIndex: null,
            totalSentences: 0,
            segments: [],
          });
          setCurrentSpeechId(null);
          return;
        }

        if (isPausedRef.current) {
          return;
        }

        const segment = segments[idx];
        if (!segment) {
          ttsOperationInProgressRef.current = false;
          setTtsState({
            speaking: false,
            paused: false,
            lastText: "",
            sentenceIndex: null,
            totalSentences: 0,
            segments: [],
          });
          setCurrentSpeechId(null);
          return;
        }
        setTtsState({
          speaking: true,
          paused: false,
          lastText: segment,
          sentenceIndex: idx,
          totalSentences: segments.length,
          segments,
        });
        sentenceIndexRef.current = idx;

        const speechId = Speech.speak(segment, {
          language: "en-US",
          rate: rate,
          onDone: () => {
            if (shouldStopRef.current || isPausedRef.current) return;
            idx += 1;
            if (idx < segments.length) {
              speakNext();
            } else {
              ttsOperationInProgressRef.current = false;
              setTtsState({
                speaking: false,
                paused: false,
                lastText: "",
                sentenceIndex: null,
                totalSentences: segments.length,
                segments: [],
              });
              setCurrentSpeechId(null);
            }
          },
          onStopped: () => {
            // Only update state if we're not intentionally paused or stopped
            if (!isPausedRef.current && !shouldStopRef.current) {
              setTtsState((s) => ({
                ...s,
                speaking: false,
                paused: false,
                sentenceIndex: null,
              }));
            }
          },
          onError: () =>
            setTtsState((s) => ({
              ...s,
              speaking: false,
              paused: false,
              sentenceIndex: null,
            })),
        });
        setCurrentSpeechId(speechId);
      };

      speakNext();
    },
    []
  );

  const pauseSpeaking = useCallback(() => {
    if (!ttsOperationInProgressRef.current) return; // Ignore if no TTS active
    isPausedRef.current = true;
    shouldStopRef.current = false;
    Speech.stop();
    setTtsState((s) => ({ ...s, speaking: false, paused: true }));
  }, []);

  const resumeSpeaking = useCallback(
    (doc, mode, rate = 1.0) => {
      if (!doc) return;
      isPausedRef.current = false;
      shouldStopRef.current = false;
      const currentIdx =
        sentenceIndexRef.current !== null ? sentenceIndexRef.current + 1 : 0;
      speak(doc, mode, currentIdx, rate);
    },
    [speak]
  );

  const seekToSentence = useCallback(
    (doc, mode, sentenceIndex, rate = 1.0) => {
      if (!doc) return;
      const sentenceCount =
        mode === "simplified"
          ? splitSentences(doc.simplifiedText).length
          : doc.sentences?.length || splitSentences(doc.rawText).length;
      if (sentenceIndex < 0 || sentenceIndex >= sentenceCount) {
        return;
      }
      Speech.stop();
      speak(doc, mode, sentenceIndex, rate);
    },
    [speak]
  );

  const stopSpeaking = useCallback(() => {
    shouldStopRef.current = true;
    isPausedRef.current = false;
    ttsOperationInProgressRef.current = false;
    Speech.stop();
    setTtsState({
      speaking: false,
      paused: false,
      lastText: "",
      sentenceIndex: null,
      totalSentences: 0,
      segments: [],
    });
    sentenceIndexRef.current = null;
    setCurrentSpeechId(null);
  }, []);

  return {
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
  };
};
