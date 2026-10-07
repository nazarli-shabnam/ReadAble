import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { ReadingSettings } from "./ReadingSettings";

const show = (changes) =>
  render(<ReadingSettings settings={{ ...DEFAULT_SETTINGS, overlayEnabled: true, ...changes }} onChange={() => {}} />);

test("tint controls are shown when high contrast is off", () => {
  show({});
  expect(screen.getByLabelText("Colored background")).toBeTruthy();
  expect(screen.getByLabelText("Cream")).toBeTruthy();
  expect(screen.getByText("Tint strength")).toBeTruthy();
});

test("tint controls are replaced by a note in high contrast", () => {
  show({ highContrast: true });
  expect(screen.queryByLabelText("Colored background")).toBeNull();
  expect(screen.queryByLabelText("Cream")).toBeNull();
  expect(screen.queryByText("Tint strength")).toBeNull();
  expect(screen.getByText(/not used in high contrast/)).toBeTruthy();
});

test("choosing a voice saves it and plays a sample with it", () => {
  const onChange = jest.fn();
  const speech = { play: jest.fn() };
  const voices = [{ identifier: "v1", name: "Alex", language: "en-US" }];
  render(<ReadingSettings settings={DEFAULT_SETTINGS} onChange={onChange} voices={voices} speech={speech} />);

  fireEvent.press(screen.getByText("Device default"));
  fireEvent.press(screen.getByText("Alex"));
  expect(onChange).toHaveBeenCalledWith({ voice: "v1" });
  expect(speech.play).toHaveBeenCalledWith(["This is how I sound."], 0, "preview", "v1");
});

test("no voice picker when the device lists no English voices", () => {
  render(<ReadingSettings settings={DEFAULT_SETTINGS} onChange={() => {}} voices={[]} speech={{ play: jest.fn() }} />);
  expect(screen.queryByText("Voice")).toBeNull();
});

test("reset restores every default after confirmation", async () => {
  const dialogs = require("../utils/dialogs");
  jest.spyOn(dialogs, "confirmAsync").mockResolvedValue(true);
  const onChange = jest.fn();
  render(<ReadingSettings settings={{ ...DEFAULT_SETTINGS, fontSize: 30 }} onChange={onChange} />);
  fireEvent.press(screen.getByText("Reset to defaults"));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith(DEFAULT_SETTINGS));
});

test("reset does nothing when cancelled", async () => {
  const dialogs = require("../utils/dialogs");
  jest.spyOn(dialogs, "confirmAsync").mockResolvedValue(false);
  const onChange = jest.fn();
  render(<ReadingSettings settings={DEFAULT_SETTINGS} onChange={onChange} />);
  fireEvent.press(screen.getByText("Reset to defaults"));
  await Promise.resolve();
  expect(onChange).not.toHaveBeenCalled();
});
