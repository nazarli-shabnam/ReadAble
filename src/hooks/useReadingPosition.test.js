import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { buildDocument } from "../utils/textProcessing";
import { loadPosition, saveDocument, savePosition } from "../utils/storage";
import { useReadingPosition } from "./useReadingPosition";

beforeEach(async () => {
  await AsyncStorage.clear();
  await saveDocument(buildDocument("One. Two. Three. Four. Five.", { id: "a" }));
});

test("storage keeps a clamped ratio, forgets 0 and drops unknown texts", async () => {
  await savePosition("a", 0.5);
  await savePosition("ghost", 0.9); // not a saved text
  expect(await loadPosition("a")).toBe(0.5);
  expect(await loadPosition("ghost")).toBe(0);

  await savePosition("a", 7);
  expect(await loadPosition("a")).toBe(1);
  await savePosition("a", 0);
  expect(await loadPosition("a")).toBe(0);
});

test("loads the saved position and maps it onto the shown sentences", async () => {
  await savePosition("a", 0.5);
  const { result, rerender } = renderHook(({ n }) => useReadingPosition("a", n), {
    initialProps: { n: 5 },
  });
  await waitFor(() => expect(result.current.loadedFor).toBe("a"));
  expect(result.current.resumeIndex).toBe(2);

  rerender({ n: 9 }); // the other version splits into more sentences
  expect(result.current.resumeIndex).toBe(4);
});

test("remember saves shortly after, and the next open resumes from there", async () => {
  jest.useFakeTimers();
  try {
    const { result } = renderHook(() => useReadingPosition("a", 5));
    act(() => result.current.remember(3));
    expect(result.current.resumeIndex).toBe(3);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  } finally {
    jest.useRealTimers();
  }
  expect(await loadPosition("a")).toBe(0.75);
});
