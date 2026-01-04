import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  DOCUMENTS: "@readable:documents",
  HISTORY: "@readable:history",
};

export const saveDocument = async (doc) => {
  try {
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
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn("Failed to load documents:", err);
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
