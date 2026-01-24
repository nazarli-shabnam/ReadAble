# ReadAble

Mobile assistive reading app with on-device OCR, text processing, and TTS for dyslexia support.

## Features

- **OCR**: Capture text from images (ML Kit/Apple Vision, fallback stub)
- **Text Processing**: Summarization, simplification, date/amount extraction
- **Dyslexia-Friendly Reader**:
  - Atkinson Hyperlegible font
  - Adjustable font size, line height, letter spacing
  - Color overlays, high contrast mode
  - Focus mode (one-line reading)
  - Sentence highlighting during TTS
- **Text-to-Speech**: Sentence-by-sentence playback with pause/resume/seek
- **Q&A System**: Ask questions with confidence scores
- **Document History**: Auto-save, reopen, export, delete
- **Privacy**: Offline-first with cloud opt-in toggle

## Tech Stack

- React Native 0.77.0, React 18.3.1, Expo SDK 54
- JavaScript/JSX
- AsyncStorage (local only)
- ML Kit (Android) / Apple Vision (iOS)
- Platforms: iOS, Android, Web

## Prerequisites

- Node.js 20.19.4+ (or use `--ignore-engines` for 20.15.0+)
- Yarn (via Corepack)
- Expo CLI

## Installation

```bash
git clone <repository-url>
cd ReadAble
corepack yarn install --ignore-engines
```

## Running

```bash
# Start dev server
corepack yarn start

# Platform-specific
corepack yarn android
corepack yarn ios
corepack yarn web
```

## Usage

1. **Add Text**: Camera capture, image picker, sample text, or manual input
2. **Process**: Tap "Process" to analyze and extract key info
3. **Read**: Toggle Simplified/Original, adjust accessibility settings
4. **Ask Questions**: Type questions, get answers with confidence scores
5. **Listen**: Play TTS with sentence highlighting
6. **History**: View, reopen, export, or delete documents

## Project Structure

```
ReadAble/
├── App.js                 # Main component
├── index.js               # Entry point
├── src/
│   ├── components/        # UI components
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utilities (OCR, storage, text processing)
└── assets/                # Icons and images
```

## OCR Setup

For real OCR (not stub):
- Build custom dev client: `npx expo prebuild`
- Run: `npx expo run:ios` or `npx expo run:android`
- Expo Go shows placeholder text

See [expo-go.md](./expo-go.md) for Expo Go quick start.

## Testing

```bash
corepack yarn test
corepack yarn test:watch
corepack yarn test:coverage
```

See [testing-guide.md](./testing-guide.md) for manual testing steps.

## Known Limitations

- OCR requires custom dev build (Expo Go shows placeholder)
- Node <20.19.4 needs `--ignore-engines` flag
- Basic summarization (not AI-powered)
- Token-based Q&A (no embeddings)

See [improvements.md](./improvements.md) for planned enhancements.

## Platform Support

- **iOS/Android**: Full native support
- **Web**: Works in browsers (see [MACOS_COMPATIBILITY.md](./MACOS_COMPATIBILITY.md) for macOS)

## License

See LICENSE file.
