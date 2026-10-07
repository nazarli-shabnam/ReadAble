import * as DocumentPicker from "expo-document-picker";
import { MAX_IMPORT_BYTES, pickTextFile } from "./importText";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));

const pick = (asset) => DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [asset] });
const fileBody = (text) => {
  global.fetch = jest.fn(() => Promise.resolve({ text: () => Promise.resolve(text) }));
};

beforeEach(() => jest.clearAllMocks());

test("returns the text of the chosen file, trimmed", async () => {
  pick({ uri: "file:///a.txt", size: 12 });
  fileBody("  Hello there.\n");
  await expect(pickTextFile()).resolves.toEqual({ status: "ok", text: "Hello there." });
});

test("cancelling, empty and oversized files are reported, not read", async () => {
  DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
  await expect(pickTextFile()).resolves.toEqual({ status: "canceled" });

  pick({ uri: "file:///big.txt", size: MAX_IMPORT_BYTES + 1 });
  fileBody("never read");
  await expect(pickTextFile()).resolves.toEqual({ status: "tooLarge" });
  expect(global.fetch).not.toHaveBeenCalled();

  pick({ uri: "file:///empty.txt", size: 1 });
  fileBody("  \n ");
  await expect(pickTextFile()).resolves.toEqual({ status: "empty" });
});

test("a read failure becomes an error status", async () => {
  pick({ uri: "file:///a.txt", size: 5 });
  global.fetch = jest.fn(() => Promise.reject(new Error("nope")));
  await expect(pickTextFile()).resolves.toEqual({ status: "error" });
});
