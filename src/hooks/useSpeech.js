import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

const IDLE = { status: "idle", index: null, total: 0, source: null };

/**
 * Sentence-by-sentence text-to-speech.
 *
 * Every play/seek starts a new session; callbacks from an older session
 * (e.g. the late onDone/onError of an utterance we just stopped) are ignored,
 * so they can never overwrite the state of the current one.
 *
 * @param {number} rate - speech rate; changes apply from the next sentence
 * @param {string} [voice] - voice identifier; empty means the device default
 * @returns {{
 *   status: "idle"|"speaking"|"paused", index: number|null, total: number,
 *   source: string|null, play: Function, pause: Function, resume: Function,
 *   stop: Function, prev: Function, next: Function
 * }}
 */
export const useSpeech = (rate = 1, voice = "") => {
  const [state, setState] = useState(IDLE);
  const sessionRef = useRef(0);
  const sentencesRef = useRef([]);
  const sourceRef = useRef(null);
  const indexRef = useRef(null);
  const rateRef = useRef(rate);
  const voiceRef = useRef(voice);
  const voiceOverrideRef = useRef(null);

  useEffect(() => {
    rateRef.current = rate;
    voiceRef.current = voice;
  }, [rate, voice]);

  const voiceFor = () => voiceOverrideRef.current ?? voiceRef.current;

  const speakFrom = useCallback((startIndex) => {
    const session = ++sessionRef.current;
    Speech.stop();
    const sentences = sentencesRef.current;
    const total = sentences.length;

    const step = (i) => {
      if (session !== sessionRef.current) return;
      if (i >= total) {
        indexRef.current = null;
        setState(IDLE);
        return;
      }
      indexRef.current = i;
      setState({ status: "speaking", index: i, total, source: sourceRef.current });
      Speech.speak(sentences[i], {
        language: "en-US",
        rate: rateRef.current,
        ...(voiceFor() ? { voice: voiceFor() } : {}),
        onDone: () => step(i + 1),
        onError: () => {
          if (session !== sessionRef.current) return;
          sessionRef.current++;
          indexRef.current = null;
          setState(IDLE);
        },
      });
    };
    step(Math.min(Math.max(0, startIndex), total));
  }, []);

  /**
   * Speaks `sentences` (strings) from `startIndex`; `source` labels what is playing.
   * `voiceOverride` (an identifier, or "" for the default) is used instead of the
   * chosen voice, e.g. to preview one.
   */
  const play = useCallback(
    (sentences, startIndex = 0, source = "document", voiceOverride = null) => {
      voiceOverrideRef.current = voiceOverride;
      sentencesRef.current = sentences.filter((s) => s && s.trim());
      sourceRef.current = source;
      speakFrom(startIndex);
    },
    [speakFrom]
  );

  const stop = useCallback(() => {
    sessionRef.current++;
    Speech.stop();
    indexRef.current = null;
    setState(IDLE);
  }, []);

  // Speech can't be paused mid-sentence on every platform, so pause stops
  // and resume replays the interrupted sentence from its start.
  const pause = useCallback(() => {
    if (indexRef.current === null) return;
    sessionRef.current++;
    Speech.stop();
    setState((s) => (s.status === "speaking" ? { ...s, status: "paused" } : s));
  }, []);

  const resume = useCallback(() => {
    if (indexRef.current !== null) speakFrom(indexRef.current);
  }, [speakFrom]);

  const seekBy = useCallback(
    (delta) => {
      if (indexRef.current === null) return;
      const target = indexRef.current + delta;
      if (target < 0 || target >= sentencesRef.current.length) return;
      speakFrom(target);
    },
    [speakFrom]
  );
  const prev = useCallback(() => seekBy(-1), [seekBy]);
  const next = useCallback(() => seekBy(1), [seekBy]);

  // Never keep talking after the screen goes away.
  useEffect(
    () => () => {
      sessionRef.current++;
      Speech.stop();
    },
    []
  );

  return { ...state, play, pause, resume, stop, prev, next };
};
