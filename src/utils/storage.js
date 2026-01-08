import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  DOCUMENTS: "@readable:documents",
  HISTORY: "@readable:history",
};

const isValidDocument = (doc) => {
  if (!doc || typeof doc !== "object") return false;
  if (!doc.id || typeof doc.id !== "string") return false;
  if (!doc.rawText || typeof doc.rawText !== "string") return false;
  if (!doc.createdAt || typeof doc.createdAt !== "string") return false;
  if (doc.sentences && !Array.isArray(doc.sentences)) return false;
  if (doc.sentenceMeta && !Array.isArray(doc.sentenceMeta)) return false;
  if (doc.highlights && typeof doc.highlights !== "object") return false;
  return true;
};

const validateDocuments = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs.filter((doc) => {
    if (!isValidDocument(doc)) {
      console.warn("Invalid document found, skipping:", doc?.id);
      return false;
    }
    return true;
  });
};

export const saveDocument = async (doc) => {
  try {
    if (!isValidDocument(doc)) {
      console.error("Cannot save invalid document:", doc);
      return false;
    }
    const existing = await loadDocuments();
    const updated = [doc, ...existing.filter((d) => d.id !== doc.id)].slice(
      0,
      50
    );
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.warn("Failed to save document:", err);
    return false;
  }
};

export const loadDocuments = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    const validated = validateDocuments(parsed);
    
    if (validated.length !== parsed.length) {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(validated));
      } catch (saveErr) {
        console.warn("Failed to save cleaned documents:", saveErr);
      }
    }
    
    return validated;
  } catch (err) {
    console.warn("Failed to load documents, clearing corrupted data:", err);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    } catch (clearErr) {
      console.warn("Failed to clear corrupted storage:", clearErr);
    }
    return [];
  }
};

export const deleteDocument = async (docId) => {
  try {
    const existing = await loadDocuments();
    const updated = existing.filter((d) => d.id !== docId);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.warn("Failed to delete document:", err);
    return false;
  }
};

export const exportDocumentSummary = (doc) => {
  if (!doc) return "";
  const lines = [
    `Document: ${doc.id}`,
    `Created: ${doc.createdAt}`,
    "",
    "=== Summary ===",
    doc.summary || "No summary available.",
    "",
    "=== Key Information ===",
  ];
  if (doc.highlights?.dates?.length) {
    lines.push("Dates:");
    doc.highlights.dates.forEach((d) => lines.push(`  - ${d.value}`));
  }
  if (doc.highlights?.amounts?.length) {
    lines.push("Amounts:");
    doc.highlights.amounts.forEach((a) => lines.push(`  - ${a.value}`));
  }
  lines.push("");
  lines.push("=== Simplified Text ===");
  lines.push(doc.simplifiedText || doc.rawText);
  return lines.join("\n");
};

export const clearAllDocuments = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    return true;
  } catch (err) {
    console.warn("Failed to clear all documents:", err);
    return false;
  }
};
