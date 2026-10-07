import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { shareOrCopy } from "./share";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve()) }));

beforeEach(() => {
  jest.restoreAllMocks();
  Clipboard.setStringAsync.mockClear();
});

test("shares through the share sheet", async () => {
  jest.spyOn(Share, "share").mockResolvedValue({});
  await expect(shareOrCopy("hi")).resolves.toBe("shared");
  expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
});

test("closing the share sheet leaves the clipboard alone", async () => {
  const abort = Object.assign(new Error("Share canceled"), { name: "AbortError" });
  jest.spyOn(Share, "share").mockRejectedValue(abort);
  await expect(shareOrCopy("hi")).resolves.toBe("dismissed");
  expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
});

test("falls back to the clipboard when sharing is unavailable", async () => {
  jest.spyOn(Share, "share").mockRejectedValue(new Error("Share is not supported in this browser"));
  await expect(shareOrCopy("hi")).resolves.toBe("copied");
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith("hi");
});
