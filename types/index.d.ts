/**
 * TypeScript type definitions for ReadAble
 * 
 * This file provides type safety for the codebase.
 * To migrate to TypeScript:
 * 1. Install TypeScript: yarn add -D typescript @types/react @types/react-native
 * 2. Create tsconfig.json
 * 3. Rename .js files to .ts/.tsx gradually
 * 4. Use these types as reference
 */

// Document types
export interface SentenceRange {
  start: number;
  end: number;
}

export interface SentenceData {
  text: string;
  start: number;
  end: number;
}

export interface SentenceMeta {
  text: string;
  tokens: string[];
  termFreq: Record<string, number>;
  range: SentenceRange;
}

export interface HighlightSpan {
  id: string;
  value: string;
  index: number;
}

export interface DocumentHighlights {
  dates: HighlightSpan[];
  amounts: HighlightSpan[];
}

export interface DocumentStructure {
  type: "list" | "table" | "heading";
  lineIndex: number;
  content: string;
}

export interface Document {
  id: string;
  rawText: string;
  sentences: string[];
  sentenceMeta: SentenceMeta[];
  sentenceRanges: SentenceRange[];
  summary: string;
  simplifiedText: string;
  highlights: DocumentHighlights;
  structures: DocumentStructure[];
  createdAt: string;
}

// Question answering types
export interface QuestionAnalysis {
  questionType: "date" | "amount" | "person" | "location" | "detail" | "general";
  keywords: string[];
  tokens: string[];
  dates: string[];
  amounts: string[];
}

export interface AnswerResult {
  answer: string;
  confidence: number;
  source: {
    sentenceIndex?: number;
    sentence?: string;
    type?: "date_highlight" | "amount_highlight" | "summary" | "fallback";
  } | null;
}

// OCR types
export interface OCRBlock {
  text: string;
  boundingBox?: any;
  lines?: Array<{
    text: string;
    boundingBox?: any;
  }>;
}

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  meta: {
    provider: "mlkit" | "stub" | "error";
    sourceUri?: string;
    error?: string;
    createdAt: string;
  };
}

// Storage types
export interface StorageKeys {
  DOCUMENTS: string;
  HISTORY: string;
  OFFLINE_MODE: string;
}

// TTS types
export interface TTSState {
  speaking: boolean;
  paused: boolean;
  lastText: string;
  sentenceIndex: number | null;
  totalSentences: number;
  segments: string[];
}

// Hook return types
export interface UseDocumentProcessorReturn {
  activeDoc: Document | null;
  history: Document[];
  loading: boolean;
  processDocument: (text: string) => Promise<Document | null>;
  loadDocument: (docId: string) => Promise<Document | undefined>;
  refreshDocuments: () => Promise<void>;
  runQuestion: (question: string) => AnswerResult;
  speak: (doc: Document, mode?: string, startIndex?: number, rate?: number) => void;
  pauseSpeaking: () => void;
  resumeSpeaking: (doc: Document, mode: string, rate?: number) => void;
  seekToSentence: (doc: Document, mode: string, sentenceIndex: number, rate?: number) => void;
  stopSpeaking: () => void;
  ttsState: TTSState;
}

// Component prop types
export interface HighlightedTextProps {
  text: string;
  dates?: HighlightSpan[];
  amounts?: HighlightSpan[];
  style?: any;
  highlightStyle?: any;
  sentences?: string[];
  activeSentenceIndex?: number | null;
  highContrast?: boolean;
  sentenceRanges?: SentenceRange[] | null;
}

export interface AccessibilityControlsProps {
  highContrast: boolean;
  onToggleContrast: () => void;
  fontScale: number;
  onFontScaleChange: (value: number) => void;
  lineHeight: number;
  onLineHeightChange: (value: number) => void;
  letterSpacing: number;
  onLetterSpacingChange: (value: number) => void;
  overlayEnabled: boolean;
  onToggleOverlay: () => void;
  overlayColor: string;
  onOverlayColorChange: (color: string) => void;
  overlayOpacity: number;
  onOverlayOpacityChange: (opacity: number) => void;
  selectedFont: string;
  onFontChange: (font: string) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  ttsRate: number;
  onTtsRateChange: (rate: number) => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  message?: string;
  showReload?: boolean;
  onReset?: () => void;
  onReload?: () => void;
}

// Utility function types
export type LoggerFunction = (...args: any[]) => void;

export interface Logger {
  log: LoggerFunction;
  warn: LoggerFunction;
  error: LoggerFunction;
  debug: LoggerFunction;
}
