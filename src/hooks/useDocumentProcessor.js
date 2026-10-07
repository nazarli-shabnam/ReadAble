import { useCallback, useEffect, useState } from "react";
import { buildDocument, answerQuestion, NOT_FOUND } from "../utils/textProcessing";
import {
  loadDocuments,
  saveDocument,
  deleteDocument,
  clearAllDocuments,
  updateDocumentMeta,
} from "../utils/storage";
import { warn } from "../utils/logger";

const open = (record) => (record ? buildDocument(record.rawText, record) : null);

/**
 * Owns the saved history (stored records: { id, rawText, createdAt }) and the
 * active document (built from its record, with all derived data).
 */
export const useDocumentProcessor = () => {
  const [history, setHistory] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryError(null);
      setLoading(true);
      const records = await loadDocuments();
      setHistory(records);
      setActiveDoc((current) => current || open(records[0]));
    } catch (err) {
      warn("Failed to load documents:", err);
      setHistoryError("Couldn't load your saved documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Re-read history after a change; if the active document was removed,
  // fall back to the newest remaining one.
  const refresh = useCallback(async () => {
    const records = await loadDocuments();
    setHistory(records);
    setActiveDoc((current) =>
      current && records.some((r) => r.id === current.id) ? current : open(records[0])
    );
  }, []);

  /** Builds, shows and saves a document. Throws if saving fails. */
  const processDocument = useCallback(
    async (text) => {
      if (!text?.trim()) return null;
      const doc = buildDocument(text);
      setActiveDoc(doc);
      await saveDocument(doc);
      await refresh();
      return doc;
    },
    [refresh]
  );

  const loadDocument = useCallback(
    (docId) => {
      const record = history.find((r) => r.id === docId);
      if (record) setActiveDoc(open(record));
    },
    [history]
  );

  const removeDocument = useCallback(
    async (docId) => {
      await deleteDocument(docId);
      await refresh();
    },
    [refresh]
  );

  /** Renames and/or pins a saved text; resolves false if the pin limit was reached. */
  const updateMeta = useCallback(
    async (docId, meta) => {
      const ok = await updateDocumentMeta(docId, meta);
      await refresh();
      return ok;
    },
    [refresh]
  );

  const clearHistory = useCallback(async () => {
    await clearAllDocuments();
    await refresh();
  }, [refresh]);

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
    removeDocument,
    clearHistory,
    updateMeta,
    retryLoadHistory: loadHistory,
    runQuestion,
  };
};
