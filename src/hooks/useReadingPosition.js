import { useCallback, useEffect, useRef, useState } from "react";
import { loadPosition, savePosition } from "../utils/storage";

const SAVE_DELAY_MS = 800;

/**
 * Remembers how far the reader got in a saved text.
 *
 * @param {string|undefined} docId
 * @param {number} sentenceCount - sentences in the version currently shown
 * @returns {{ resumeIndex: number, loadedFor: string|undefined, remember: (index: number) => void }}
 *   `resumeIndex` is the sentence to continue from in the shown version,
 *   `loadedFor` the document the saved position was loaded for, and
 *   `remember(index)` records the sentence just reached (saved shortly after).
 */
export const useReadingPosition = (docId, sentenceCount) => {
  const [ratio, setRatio] = useState(0);
  const [loadedFor, setLoadedFor] = useState(undefined);
  const timer = useRef(null);
  const docIdRef = useRef(docId);
  const countRef = useRef(sentenceCount);
  docIdRef.current = docId;
  countRef.current = sentenceCount;

  useEffect(() => {
    clearTimeout(timer.current);
    setRatio(0);
    setLoadedFor(undefined);
    if (!docId) return undefined;
    let cancelled = false;
    loadPosition(docId).then((saved) => {
      if (cancelled) return;
      setRatio(saved);
      setLoadedFor(docId);
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const remember = useCallback((index) => {
    const id = docIdRef.current;
    const last = countRef.current - 1;
    if (!id || last < 0) return;
    const next = last === 0 ? 0 : Math.min(1, Math.max(0, index / last));
    setRatio(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => savePosition(id, next), SAVE_DELAY_MS);
  }, []);

  const last = Math.max(0, sentenceCount - 1);
  const resumeIndex = Math.min(last, Math.round(ratio * last));
  return { resumeIndex, loadedFor, remember };
};
