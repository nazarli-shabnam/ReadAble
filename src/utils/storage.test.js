import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STORAGE_KEYS,
  loadDocuments,
  saveDocument,
  deleteDocument,
  normalizeSettings,
  loadSettings,
  saveSettings,
  exportDocumentSummary,
} from "./storage";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { buildDocument } from "./textProcessing";

const record = (id, rawText, createdAt = "2025-03-01T10:00:00.000Z") => ({
  id,
  rawText,
  createdAt,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("documents", () => {
  test("stores only id, rawText and createdAt", async () => {
    await saveDocument(buildDocument("Hello there.", { id: "a" }));
    const stored = JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS));
    expect(Object.keys(stored[0]).sort()).toEqual(["createdAt", "id", "rawText"]);
  });

  test("loads records written by older versions and skips invalid ones", async () => {
    const legacy = {
      ...record("old", "Old text."),
      sentences: ["Old text."],
      summary: "Old text.",
      simplifiedText: "Old text..",
    };
    await AsyncStorage.setItem(
      STORAGE_KEYS.DOCUMENTS,
      JSON.stringify([legacy, { id: 5 }, record("b", "   ")])
    );
    expect(await loadDocuments()).toEqual([record("old", "Old text.")]);
  });

  test("a failed read throws and leaves the data alone", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify([record("a", "Keep me.")]));
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("disk busy"));
    const removeItem = jest.spyOn(AsyncStorage, "removeItem");

    await expect(loadDocuments()).rejects.toThrow("disk busy");
    expect(removeItem).not.toHaveBeenCalled();
    expect(await loadDocuments()).toEqual([record("a", "Keep me.")]);
  });

  test("unparseable data is moved to a backup key", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, "{not json");
    expect(await loadDocuments()).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.CORRUPT_DOCUMENTS)).toBe("{not json");
    expect(await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS)).toBeNull();
  });

  test("saving the same text again replaces the old entry", async () => {
    await saveDocument(record("1", "Same text."));
    await saveDocument(record("2", "Other text."));
    await saveDocument(record("3", "Same text.  "));
    expect((await loadDocuments()).map((r) => r.id)).toEqual(["3", "2"]);
  });

  test("keeps at most 50 documents, newest first", async () => {
    for (let i = 0; i < 52; i++) await saveDocument(record(`d${i}`, `Text ${i}.`));
    const docs = await loadDocuments();
    expect(docs).toHaveLength(50);
    expect(docs[0].id).toBe("d51");
  });

  test("rejects invalid documents and deletes by id", async () => {
    await expect(saveDocument({ id: "x" })).rejects.toThrow();
    await saveDocument(record("a", "A."));
    await saveDocument(record("b", "B."));
    await deleteDocument("a");
    expect((await loadDocuments()).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("settings", () => {
  test("normalizeSettings clamps, snaps and rejects unknown values", () => {
    expect(
      normalizeSettings({
        fontSize: 99,
        lineSpacing: 1.23,
        ttsRate: "fast",
        overlayOpacity: 0.30000000000000004,
        overlayColor: "#000000",
        fontFamily: "comic-sans",
        highContrast: "yes",
        focusMode: true,
      })
    ).toEqual({
      ...DEFAULT_SETTINGS,
      fontSize: 32,
      lineSpacing: 1.2,
      overlayOpacity: 0.3,
      focusMode: true,
    });
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  test("migrates the old TTS rate key and removes legacy keys", async () => {
    await AsyncStorage.setItem("@readable:ttsRate", "1.4");
    await AsyncStorage.setItem("@readable:offlineMode", "false");
    const settings = await loadSettings();
    expect(settings.ttsRate).toBe(1.4);
    expect(await AsyncStorage.getItem("@readable:ttsRate")).toBeNull();
    expect(await AsyncStorage.getItem("@readable:offlineMode")).toBeNull();
    expect(JSON.parse(await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS)).ttsRate).toBe(1.4);
  });

  test("round-trips saved settings", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, fontSize: 22, highContrast: true });
    expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, fontSize: 22, highContrast: true });
  });

  test("falls back to defaults on corrupt settings", async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, "oops");
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

test("exportDocumentSummary lists each key detail once, in order of appearance", () => {
  const doc = buildDocument("Fee $5 due March 5. We close March 5. Late fee $5 after 6:00 PM.");
  const lines = exportDocumentSummary(doc).split("\n").filter((l) => l.startsWith("- "));
  expect(lines).toEqual([
    "- Amount: $5",
    "- Date/time: March 5",
    "- Date/time: 6:00 PM",
  ]);
});

test("exportDocumentSummary lists key information", () => {
  const doc = buildDocument("Pay $5 by March 3, 2025. Thanks.");
  const text = exportDocumentSummary(doc);
  expect(text).toContain("- Date/time: March 3, 2025");
  expect(text).toContain("- Amount: $5");
  expect(text).toContain("Simplified text");
});
