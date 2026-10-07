import { render, screen } from "@testing-library/react-native";
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
