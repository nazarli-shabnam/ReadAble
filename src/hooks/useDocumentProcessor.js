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
  }, []);

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

  const speak = useCallback((doc, mode = "simplified", startIndex = 0) => {
    if (!doc) return;
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
      // Check if we should stop
      if (shouldStopRef.current) {
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

      // Check if paused
      if (isPausedRef.current) {
        return;
      }

      const segment = segments[idx];
      if (!segment) {
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

      const speechId = Speech.speak(segment, {
        language: "en-US",
        onDone: () => {
          if (shouldStopRef.current || isPausedRef.current) return;
          idx += 1;
          if (idx < segments.length) {
            speakNext();
          } else {
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
  }, []);

  const pauseSpeaking = useCallback(() => {
    isPausedRef.current = true;
    shouldStopRef.current = false;
    Speech.stop();
    setTtsState((s) => ({ ...s, speaking: false, paused: true }));
  }, []);

  const resumeSpeaking = useCallback(
    (doc, mode) => {
      if (!doc) return;
      isPausedRef.current = false;
      shouldStopRef.current = false;
      const currentIdx =
        ttsState.sentenceIndex !== null ? ttsState.sentenceIndex + 1 : 0;
      speak(doc, mode, currentIdx);
    },
    [ttsState.sentenceIndex, speak]
  );

  const seekToSentence = useCallback(
    (doc, mode, sentenceIndex) => {
      if (!doc) return;
      Speech.stop();
      speak(doc, mode, sentenceIndex);
    },
    [speak]
  );

  const stopSpeaking = useCallback(() => {
    shouldStopRef.current = true;
    isPausedRef.current = false;
    Speech.stop();
    setTtsState({
      speaking: false,
      paused: false,
      lastText: "",
      sentenceIndex: null,
      totalSentences: 0,
      segments: [],
    });
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
