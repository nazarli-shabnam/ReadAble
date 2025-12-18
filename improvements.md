# ReadAble Improvements & Roadmap

## ✅ Completed

- **OCR Integration**: ML Kit text recognition wired with fallback stub; camera and gallery capture integrated; returns text + bounding blocks.
- **Storage/History**: AsyncStorage persistence for documents; history list with reopen/delete; export/share summaries and key facts.
- **Dyslexia-friendly Reader**: Atkinson Hyperlegible font; color overlays with adjustable opacity; sentence-level TTS highlighting; accessibility controls (font size, line height, letter spacing, high contrast).
- **Q&A System**: Advanced token-based retrieval with question type detection (date, amount, person, location); confidence scores (0-100%); source sentence citations; improved answer quality with keyword matching and phrase detection.
- **TTS Sync**: Sentence-by-sentence playback with active sentence highlighting; progress indicator.
- **TTS Enhancements**: Pause/resume functionality; seek to specific sentences; sentence navigation controls; proper state management with refs for pause/stop.
- **Font Picker**: Toggle between Atkinson Hyperlegible and System fonts.
- **Focus Mode**: One-line-at-a-time reading with navigation controls for better focus.
- **Structure Detection**: Automatic detection of lists, tables, bullets, and headings in documents.
- **Privacy Controls**: Offline mode toggle with privacy notice for cloud fallback.

## 🚧 In Progress / Next Steps

- **OCR Enhancement**: Map bounding boxes to character offsets for precise highlights; add edge detection and crop/deskew UI.
- **Camera UX**: Multi-page capture; offline language packs; guidance overlays for steady shots.

## 📋 Remaining Features

- **Runtime**: Upgrade Node to ≥20.19.4 to satisfy Metro/Expo engines (currently using `--ignore-engines` workaround).
- **Fonts**: Bundle OpenDyslexic font files; add to font picker options (currently only Atkinson and System available).
- **TTS**: Consider platform-native TTS for better timing accuracy; add adjustable pacing/speed control.
- **Retrieval/Q&A**: Add embeddings + chunked retrieval; cache embeddings per document (currently using token-based TF-IDF).
- **Summarization/Simplification**: Bridge small local model (llama.cpp GGUF 1B–3B or Phi-3-mini via onnxruntime mobile); fall back to cloud only with explicit opt-in toggle.
- **Multi-page Support**: Multi-image/page OCR; merge text with page markers; retain per-page highlights and TTS sentence mapping.
- **Structure Rendering**: Render detected structures (lists/tables) with preserved formatting in reader view.
- **Testing**: Unit tests for text processing/NER/highlighting; integration tests for capture → OCR → summary → Q&A → TTS; regression samples (flyer, bill, assignment).
