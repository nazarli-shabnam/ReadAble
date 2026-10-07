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
  updateDocumentMeta,
  MAX_DOCUMENTS,
  MAX_PINNED,
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

test("exportDocumentSummary lists key information", () => {
  const doc = buildDocument("Pay $5 by March 3, 2025. Thanks.");
  const text = exportDocumentSummary(doc);
  expect(text).toContain("- Date/time: March 3, 2025");
  expect(text).toContain("- Amount: $5");
  expect(text).toContain("Simplified text");
});

describe("titles and pins", () => {
  const save = (id, text) => saveDocument(buildDocument(text, { id }));

  test("a custom title and a pin are stored and survive loading", async () => {
    await save("a", "First text here.");
    expect(await updateDocumentMeta("a", { title: "  Tax letter  ", pinned: true })).toBe(true);
    expect((await loadDocuments())[0]).toMatchObject({ id: "a", title: "Tax letter", pinned: true });

    await updateDocumentMeta("a", { title: "", pinned: false });
    expect(Object.keys((await loadDocuments())[0]).sort()).toEqual(["createdAt", "id", "rawText"]);
  });

  test("saving the same text again keeps its title and pin", async () => {
    await save("a", "Same text.");
    await updateDocumentMeta("a", { title: "Mine", pinned: true });
    await save("b", "Same text.");
    const records = await loadDocuments();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ id: "b", title: "Mine", pinned: true });
  });

  test("pinned texts are never pushed out by the cap", async () => {
    await save("keep", "Keep this one.");
    await updateDocumentMeta("keep", { pinned: true });
    for (let i = 0; i < MAX_DOCUMENTS + 3; i++) await save(`n${i}`, `Text number ${i}.`);
    const records = await loadDocuments();
    expect(records).toHaveLength(MAX_DOCUMENTS);
    expect(records.some((r) => r.id === "keep")).toBe(true);
    expect(records[0].id).toBe(`n${MAX_DOCUMENTS + 2}`);
  });

  test("refuses to pin more than the limit", async () => {
    for (let i = 0; i <= MAX_PINNED; i++) await save(`p${i}`, `Pinned candidate ${i}.`);
    for (let i = 0; i < MAX_PINNED; i++) {
      expect(await updateDocumentMeta(`p${i}`, { pinned: true })).toBe(true);
    }
    expect(await updateDocumentMeta(`p${MAX_PINNED}`, { pinned: true })).toBe(false);
    expect(await updateDocumentMeta("missing", { pinned: true })).toBe(false);
  });
});
