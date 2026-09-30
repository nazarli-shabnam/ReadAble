import { useCallback, useEffect, useState } from "react";
import { buildDocument, answerQuestion, NOT_FOUND } from "../utils/textProcessing";
import { loadDocuments, saveDocument } from "../utils/storage";
import { log, warn, error } from "../utils/logger";

/** Owns the active document and the saved history. */
export const useDocumentProcessor = () => {
  const [history, setHistory] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      setLoading(true);
      const docs = await loadDocuments();
      setHistory(docs);
      if (docs.length > 0) setActiveDoc(docs[0]);
    } catch (err) {
      warn("Failed to load documents:", err);
      setHistoryError("Failed to load document history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const processDocument = useCallback(async (text) => {
    try {
      if (!text || !text.trim()) {
        warn("processDocument: Empty text provided");
        return null;
      }
      const doc = buildDocument(text);
      log("processDocument: Document created", {
        id: doc.id,
        sentences: doc.sentences.length,
      });
      setActiveDoc(doc);
      await saveDocument(doc);
      setHistory(await loadDocuments());
      return doc;
    } catch (err) {
      error("processDocument error:", err);
      throw err;
    }
  }, []);

  const loadDocument = useCallback(async (docId) => {
    const docs = await loadDocuments();
    const doc = docs.find((d) => d.id === docId);
    if (doc) setActiveDoc(doc);
    return doc;
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      setHistoryError(null);
      const docs = await loadDocuments();
      setHistory(docs);
      setActiveDoc((current) =>
        current && !docs.some((d) => d.id === current.id) ? docs[0] || null : current
      );
    } catch (err) {
      warn("Failed to refresh documents:", err);
      setHistoryError("Failed to refresh document history. Please try again.");
    }
  }, []);

  const runQuestion = useCallback(
    (question) => (activeDoc ? answerQuestion(question, activeDoc) : NOT_FOUND),
    [activeDoc]
  );

  return {
    activeDoc,
    history,
    loading,
    historyError,
    processDocument,
    loadDocument,
    refreshDocuments,
    retryLoadHistory: loadHistory,
    runQuestion,
  };
};
