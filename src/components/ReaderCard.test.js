import { fireEvent, render, screen } from "@testing-library/react-native";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { buildDocument, splitSentences } from "../utils/textProcessing";
import { ReaderCard } from "./ReaderCard";

const doc = buildDocument("First sentence here. Second sentence here.");
const sentences = splitSentences(doc.rawText);

const renderReader = (speech, props = {}) => {
  const fullSpeech = { total: 0, index: null, play: jest.fn(), pause: jest.fn(), resume: jest.fn(), stop: jest.fn(), prev: jest.fn(), next: jest.fn(), ...speech };
  render(
    <ReaderCard
      doc={doc}
      text={doc.rawText}
      sentences={sentences}
      viewMode="original"
      onViewModeChange={() => {}}
      settings={DEFAULT_SETTINGS}
      onSettingsChange={() => {}}
      speech={fullSpeech}
      readingIndex={speech.source === "document" ? speech.index : null}
      markedIndex={null}
      focusIndex={0}
      onFocusIndexChange={() => {}}
      {...props}
    />
  );
  return fullSpeech;
};

test("the player ignores an answer being read aloud", () => {
  const speech = renderReader({ status: "speaking", source: "answer", index: 0, total: 1 });
  expect(screen.queryByText("Pause")).toBeNull();
  expect(screen.getByText("Listen")).toBeTruthy();
  expect(screen.getByLabelText("Previous sentence")).toBeDisabled();

  fireEvent.press(screen.getByText("Listen"));
  expect(speech.pause).not.toHaveBeenCalled();
  expect(speech.play).toHaveBeenCalledWith(["First sentence here.", "Second sentence here."], 0);
});

test("the player still controls document playback", () => {
  const speech = renderReader({ status: "speaking", source: "document", index: 0, total: 2 });
  fireEvent.press(screen.getByText("Pause"));
  expect(speech.pause).toHaveBeenCalled();
});

test("in focus mode Listen starts from the sentence on screen", () => {
  const speech = renderReader(
    { status: "idle", source: null },
    { settings: { ...DEFAULT_SETTINGS, focusMode: true }, focusIndex: 1 }
  );
  fireEvent.press(screen.getByText("Listen"));
  expect(speech.play).toHaveBeenCalledWith(["First sentence here.", "Second sentence here."], 1);
});

test("outside focus mode Listen starts from the top", () => {
  const speech = renderReader({ status: "idle", source: null }, { focusIndex: 1 });
  fireEvent.press(screen.getByText("Listen"));
  expect(speech.play).toHaveBeenCalledWith(["First sentence here.", "Second sentence here."], 0);
});
