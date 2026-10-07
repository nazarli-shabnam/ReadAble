import { renderHook, act } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { useSpeech } from "./useSpeech";

const SENTENCES = ["One.", "Two.", "Three."];

// The options object passed to the nth Speech.speak call.
const call = (n) => Speech.speak.mock.calls[n][1];
const lastSpoken = () => Speech.speak.mock.calls.at(-1)[0];

beforeEach(() => {
  Speech.speak.mockClear();
  Speech.stop.mockClear();
});

test("speaks sentence by sentence and returns to idle at the end", () => {
  const { result } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES));
  expect(result.current).toMatchObject({ status: "speaking", index: 0, total: 3 });

  act(() => call(0).onDone());
  act(() => call(1).onDone());
  expect(lastSpoken()).toBe("Three.");
  expect(result.current.index).toBe(2);

  act(() => call(2).onDone());
  expect(result.current).toMatchObject({ status: "idle", index: null });
});

test("callbacks from a stopped utterance do not affect the new session", () => {
  const { result } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES));
  act(() => result.current.next()); // restarts at sentence 2
  expect(result.current.index).toBe(1);

  // The first utterance finishes or errors late: both must be ignored.
  act(() => call(0).onDone());
  act(() => call(0).onError());
  expect(result.current).toMatchObject({ status: "speaking", index: 1 });
  expect(Speech.speak).toHaveBeenCalledTimes(2);
});

test("resume replays the sentence that was paused", () => {
  const { result } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES, 1));
  act(() => result.current.pause());
  expect(result.current).toMatchObject({ status: "paused", index: 1 });

  act(() => call(0).onDone()); // late callback after pause
  expect(Speech.speak).toHaveBeenCalledTimes(1);

  act(() => result.current.resume());
  expect(lastSpoken()).toBe("Two.");
  expect(result.current).toMatchObject({ status: "speaking", index: 1 });
});

test("prev/next stay within bounds", () => {
  const { result } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES));
  act(() => result.current.prev());
  expect(result.current.index).toBe(0);
  act(() => result.current.next());
  act(() => result.current.next());
  act(() => result.current.next());
  expect(result.current.index).toBe(2);
});

test("a rate change applies from the next sentence", () => {
  const { result, rerender } = renderHook(({ rate }) => useSpeech(rate), {
    initialProps: { rate: 1 },
  });
  act(() => result.current.play(SENTENCES));
  rerender({ rate: 1.5 });
  act(() => call(0).onDone());
  expect(call(0).rate).toBe(1);
  expect(call(1).rate).toBe(1.5);
});

test("stop resets state and an error ends playback", () => {
  const { result } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES, 0, "answer"));
  expect(result.current.source).toBe("answer");
  act(() => result.current.stop());
  expect(result.current).toMatchObject({ status: "idle", index: null, source: null });

  act(() => result.current.play(SENTENCES));
  act(() => call(1).onError());
  expect(result.current.status).toBe("idle");
});

test("stops speech on unmount", () => {
  const { result, unmount } = renderHook(() => useSpeech(1));
  act(() => result.current.play(SENTENCES));
  Speech.stop.mockClear();
  unmount();
  expect(Speech.stop).toHaveBeenCalled();
});

test("speaks with the chosen voice, and with the default when none is set", () => {
  const { result, rerender } = renderHook(({ voice }) => useSpeech(1, voice), {
    initialProps: { voice: "com.example.voice" },
  });
  act(() => result.current.play(SENTENCES));
  expect(call(0).voice).toBe("com.example.voice");

  rerender({ voice: "" });
  act(() => result.current.play(SENTENCES));
  expect(call(1)).not.toHaveProperty("voice");
});

test("a voice override (a preview) wins over the chosen voice, once", () => {
  const { result } = renderHook(() => useSpeech(1, "chosen"));
  act(() => result.current.play(["Sample."], 0, "preview", "other"));
  expect(call(0).voice).toBe("other");

  act(() => result.current.play(["Sample."], 0, "preview", ""));
  expect(call(1)).not.toHaveProperty("voice");

  act(() => result.current.play(SENTENCES));
  expect(call(2).voice).toBe("chosen");
});
