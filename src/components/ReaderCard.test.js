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

test("outside focus mode a saved position turns Listen into Continue", () => {
  const speech = renderReader({ status: "idle", source: null }, { resumeIndex: 1 });
  fireEvent.press(screen.getByText("Continue"));
  expect(speech.play).toHaveBeenCalledWith(["First sentence here.", "Second sentence here."], 1);

  fireEvent.press(screen.getByText(/From the start/));
  expect(speech.play).toHaveBeenLastCalledWith(["First sentence here.", "Second sentence here."], 0);
});

describe("reading ruler", () => {
  const { rulerGeometry } = require("./ReaderCard");

  test("sits on whole lines and stays inside the text", () => {
    expect(rulerGeometry(0, 240, 24)).toEqual({ line: 0, top: 0, height: 48, lastLine: 8, lineCount: 10 });
    expect(rulerGeometry(3, 240, 24)).toMatchObject({ line: 3, top: 72 });
    expect(rulerGeometry(99, 240, 24)).toMatchObject({ line: 8, top: 192 });
    expect(rulerGeometry(-4, 240, 24).line).toBe(0);
    // A one-line text: the ruler covers that line and cannot move.
    expect(rulerGeometry(1, 24, 24)).toMatchObject({ line: 0, height: 24, lastLine: 0 });
  });

  test("buttons move the ruler once the text has been measured", () => {
    renderReader(
      { status: "idle", source: null },
      { settings: { ...DEFAULT_SETTINGS, readingRuler: true } }
    );
    expect(screen.queryByText("Line down")).toBeNull(); // not measured yet

    // 18px text at 1.5 line spacing = 27px lines; 270px of text = 10 lines.
    fireEvent(screen.getByTestId("reader-text"), "layout", { nativeEvent: { layout: { height: 270 } } });
    expect(screen.getByText("Lines 1-2 of 10")).toBeTruthy();
    fireEvent.press(screen.getByText("Line down"));
    expect(screen.getByText("Lines 2-3 of 10")).toBeTruthy();
    fireEvent.press(screen.getByText("Line up"));
    expect(screen.getByText("Lines 1-2 of 10")).toBeTruthy();
    expect(screen.getByText("Line up")).toBeDisabled();
  });
});
