import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";
import { uniqueKeySpans } from "./textProcessing";
import {
  DEFAULT_SETTINGS,
  SETTING_LIMITS,
  OVERLAY_COLORS,
  FONT_FAMILY_IDS,
  clampToStep,
} from "../constants/settings";

export const STORAGE_KEYS = {
  DOCUMENTS: "@readable:documents",
  CORRUPT_DOCUMENTS: "@readable:documents.corrupt",
  SETTINGS: "@readable:settings",
  POSITIONS: "@readable:positions",
};

// Keys written by earlier versions.
const LEGACY_KEYS = {
  TTS_RATE: "@readable:ttsRate",
  OFFLINE_MODE: "@readable:offlineMode",
  HISTORY: "@readable:history",
};

export const MAX_DOCUMENTS = 50;
export const MAX_PINNED = 10;
const MAX_TITLE_LENGTH = 120;

// ---------------------------------------------------------------------------
// Documents
//
// Only { id, rawText, createdAt } plus the reader's own choices (an optional
// custom `title`, and `pinned`) are stored; everything else is derived by
// buildDocument when a document is opened. Records written by older versions
// (which also stored derived fields) load the same way.
// ---------------------------------------------------------------------------

const toRecord = (doc) => {
  if (!doc || typeof doc !== "object") return null;
  const { id, rawText, createdAt } = doc;
  if (typeof id !== "string" || !id) return null;
  if (typeof rawText !== "string" || !rawText.trim()) return null;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) return null;
  const record = { id, rawText, createdAt };
  const title = typeof doc.title === "string" ? doc.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (title) record.title = title;
  if (doc.pinned === true) record.pinned = true;
  return record;
};

// Newest first; pinned texts always stay, the newest others fill the rest.
const capRecords = (records) => {
  const pinned = records.filter((r) => r.pinned);
  const others = records.filter((r) => !r.pinned);
  const keep = new Set([...pinned, ...others.slice(0, Math.max(0, MAX_DOCUMENTS - pinned.length))]);
  return records.filter((r) => keep.has(r));
};

const writeRecords = (records) =>
  AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(records));

/**
 * Loads saved document records, newest first.
 *
 * A failed read throws (the data may be fine; the caller offers a retry).
 * Unparseable data is moved to a backup key rather than deleted, so a bug or
 * partial write never silently destroys the user's history.
 *
 * @returns {Promise<Array<{id: string, rawText: string, createdAt: string}>>}
 */
export const loadDocuments = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed)) {
    warn("Saved documents are unreadable; moving them to a backup key.");
    await AsyncStorage.setItem(STORAGE_KEYS.CORRUPT_DOCUMENTS, raw);
    await AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    return [];
  }

  const records = parsed.map(toRecord).filter(Boolean);
  if (records.length !== parsed.length) {
    warn(`Skipped ${parsed.length - records.length} invalid saved document(s).`);
  }
  return records;
};

/**
 * Saves a document at the top of the history. Saving text that is already in
 * the history replaces that entry instead of adding a duplicate.
 */
export const saveDocument = async (doc) => {
  const record = toRecord(doc);
  if (!record) throw new Error("Cannot save an invalid document.");
  const existing = await loadDocuments();
  const isSame = (r) => r.id === record.id || r.rawText.trim() === record.rawText.trim();
  // Saving text that is already saved keeps the title and pin the reader gave it.
  const previous = existing.find(isSame);
  const merged = { ...record, ...(previous?.title && !record.title ? { title: previous.title } : {}) };
  if (previous?.pinned) merged.pinned = true;
  await writeRecords(capRecords([merged, ...existing.filter((r) => !isSame(r))]));
};

/**
 * Renames and/or pins a saved text. `title` "" goes back to the automatic title.
 * Pinning is refused (returns false) beyond MAX_PINNED.
 */
export const updateDocumentMeta = async (docId, { title, pinned }) => {
  const existing = await loadDocuments();
  const target = existing.find((r) => r.id === docId);
  if (!target) return false;
  if (pinned === true && !target.pinned && existing.filter((r) => r.pinned).length >= MAX_PINNED) {
    return false;
  }
  const { title: _title, pinned: _pinned, ...base } = target;
  const next = toRecord({
    ...base,
    title: title === undefined ? target.title : title,
    pinned: pinned === undefined ? target.pinned : pinned,
  });
  await writeRecords(existing.map((r) => (r.id === docId ? next : r)));
  return true;
};

export const deleteDocument = async (docId) => {
  const existing = await loadDocuments();
  await writeRecords(existing.filter((r) => r.id !== docId));
};

export const clearAllDocuments = () => AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS);

// ---------------------------------------------------------------------------
// Reading positions
//
// Kept apart from the saved texts: { [docId]: ratio } where ratio (0-1) is how
// far through the text the reader got. A ratio instead of a sentence number
// stays valid when the Simplified and Original versions split differently.
// ---------------------------------------------------------------------------

const loadPositions = async () => {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.POSITIONS)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/** How far through a saved text the reader got, 0-1 (0 if unknown). */
export const loadPosition = async (docId) => {
  const ratio = (await loadPositions())[docId];
  return typeof ratio === "number" && ratio > 0 && ratio <= 1 ? ratio : 0;
};

/** Remembers the position; 0 forgets it. Positions of texts that are gone are dropped. */
export const savePosition = async (docId, ratio) => {
  try {
    const known = new Set((await loadDocuments()).map((r) => r.id));
    const positions = await loadPositions();
    const next = {};
    Object.keys(positions).forEach((id) => {
      if (known.has(id) && id !== docId) next[id] = positions[id];
    });
    const clamped = Math.min(1, Math.max(0, Number(ratio) || 0));
    if (clamped > 0 && known.has(docId)) next[docId] = Math.round(clamped * 1000) / 1000;
    await AsyncStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(next));
  } catch (err) {
    warn("Failed to save the reading position:", err);
  }
};

export const exportDocumentSummary = (doc) => {
  if (!doc) return "";
  const lines = [
    "ReadAble summary",
    `Saved: ${new Date(doc.createdAt).toLocaleString()}`,
    "",
    "Summary",
    doc.summary || "No summary available.",
  ];
  // The same list the Summary card shows: in order of appearance, each value once.
  const facts = uniqueKeySpans(doc.rawText);
  if (facts.length) {
    lines.push("", "Key information");
    facts.forEach((f) => lines.push(`- ${f.type === "date" ? "Date/time" : "Amount"}: ${f.value}`));
  }
  lines.push("", "Simplified text", doc.simplifiedText || doc.rawText);
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Returns a complete, valid settings object; bad or missing fields fall back to defaults. */
export const normalizeSettings = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const settings = { ...DEFAULT_SETTINGS };

  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const value = source[key];
    const fallback = DEFAULT_SETTINGS[key];
    if (typeof fallback === "boolean") {
      if (typeof value === "boolean") settings[key] = value;
    } else if (typeof fallback === "number") {
      if (typeof value === "number" && Number.isFinite(value)) {
        settings[key] = clampToStep(value, SETTING_LIMITS[key]);
      }
    }
  });

  if (OVERLAY_COLORS.some((c) => c.value === source.overlayColor)) {
    settings.overlayColor = source.overlayColor;
  }
  if (FONT_FAMILY_IDS.includes(source.fontFamily)) {
    settings.fontFamily = source.fontFamily;
  }
  return settings;
};

/** Loads settings, migrating preferences saved by earlier versions. */
export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return normalizeSettings(JSON.parse(raw));

    const legacyRate = await AsyncStorage.getItem(LEGACY_KEYS.TTS_RATE);
    const settings = normalizeSettings({
      ttsRate: legacyRate ? JSON.parse(legacyRate) : undefined,
    });
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    await AsyncStorage.multiRemove(Object.values(LEGACY_KEYS));
    return settings;
  } catch (err) {
    warn("Failed to load settings, using defaults:", err);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(normalizeSettings(settings)));
  } catch (err) {
    warn("Failed to save settings:", err);
  }
};
