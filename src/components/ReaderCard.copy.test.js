import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { buildDocument, splitSentences } from "../utils/textProcessing";
import { ReaderCard } from "./ReaderCard";

const doc = buildDocument("First sentence here. Second sentence here.");

test("Copy text copies the version on screen", async () => {
  render(
    <ReaderCard
      doc={doc}
      text={doc.rawText}
      sentences={splitSentences(doc.rawText)}
      viewMode="original"
      onViewModeChange={() => {}}
      settings={DEFAULT_SETTINGS}
      onSettingsChange={() => {}}
      speech={{ status: "idle", source: null, index: null, total: 0 }}
      readingIndex={null}
      focusIndex={0}
      onFocusIndexChange={() => {}}
    />
  );
  fireEvent.press(screen.getByText("Copy text"));
  await screen.findByText("Copied ✓");
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(doc.rawText);
});
