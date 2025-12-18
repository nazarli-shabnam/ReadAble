# ReadAble

A mobile assistive reading app that uses on-device OCR, text processing, and TTS to make printed text easier to read for people with dyslexia and reading difficulties.

## Features

### ✅ Implemented

- **OCR Text Recognition**: Capture text from images using ML Kit (Android) / Apple Vision (iOS) with fallback stub
- **Text Processing**: Automatic summarization, simplification, and key information extraction (dates, amounts)
- **Dyslexia-Friendly Reader**:
  - Atkinson Hyperlegible font
  - Adjustable font size, line height, and letter spacing
  - Color overlays with customizable opacity
  - High contrast mode
  - Sentence-level highlighting during TTS
- **Text-to-Speech**: Sentence-by-sentence playback with active sentence highlighting
- **Q&A System**: Ask questions about processed documents with token-based retrieval
- **Document History**:
  - Automatic persistence with AsyncStorage
  - History list with document previews
  - Reopen previous documents
  - Export summaries and key facts
  - Delete documents

## Prerequisites

- **Node.js**: Version 20.19.4 or higher (currently using `--ignore-engines` workaround for Node 20.15.0)
- **Yarn**: Package manager (configured via Corepack)
- **Expo CLI**: For running the development server
- **Mobile Device or Emulator**:
  - iOS: Requires Xcode and iOS Simulator (or physical device)
  - Android: Requires Android Studio and Android Emulator (or physical device)
  - Web: Works in modern browsers (including on macOS)
  - macOS: Use web version (`yarn start --web`) - see [MACOS_COMPATIBILITY.md](./MACOS_COMPATIBILITY.md)

### For Real OCR (ML Kit / Apple Vision)

To use actual OCR instead of the stub:

- **Android**: Requires Expo Dev Client with `@react-native-ml-kit/text-recognition` native module
- **iOS**: Requires Expo Dev Client with Apple Vision framework support
- **Note**: OCR will show a placeholder message in Expo Go; build a custom development client for full functionality

## Installation

1. **Clone the repository** (if applicable):

   ```bash
   git clone <repository-url>
   cd ReadAble
   ```

2. **Install dependencies**:

   ```bash
   corepack yarn install --ignore-engines
   ```

   > **Note**: If you have Node.js ≥20.19.4, you can run `corepack yarn install` without the `--ignore-engines` flag.

3. **Verify installation**:
   ```bash
   corepack yarn start
   ```

## Running the Project

### Development Server

Start the Expo development server:

```bash
corepack yarn start
```

Or use the npm scripts:

```bash
# Start with interactive menu
corepack yarn start

# Start for Android
corepack yarn android

# Start for iOS
corepack yarn ios

# Start for web
corepack yarn web
```

### Running on Devices

1. **Expo Go** (Quick Testing):

   - Install Expo Go app on your device
   - Scan the QR code from the terminal
   - **Note**: OCR will show placeholder text in Expo Go

2. **Development Build** (Full Features):
   - Build a custom development client:
     ```bash
     npx expo install expo-dev-client
     npx expo prebuild
     ```
   - For iOS:
     ```bash
     npx expo run:ios
     ```
   - For Android:
     ```bash
     npx expo run:android
     ```

## Project Structure

```
ReadAble/
├── App.js                 # Main application component
├── index.js               # Entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
├── src/
│   ├── components/
│   │   ├── AccessibilityControls.js  # Font/spacing/overlay controls
│   │   └── HighlightedText.js         # Text renderer with highlights
│   ├── constants/
│   │   └── sampleText.js              # Sample text for testing
│   ├── hooks/
│   │   └── useDocumentProcessor.js    # Document processing & TTS logic
│   └── utils/
│       ├── ocr.js                     # OCR integration (ML Kit stub)
│       ├── storage.js                 # AsyncStorage persistence
│       └── textProcessing.js          # Text analysis & Q&A
└── assets/               # App icons and images
```

## Usage Guide

### 1. Adding Text

- **Camera Capture**: Tap "Capture with camera" to take a photo
- **Image Picker**: Tap "Pick image" to select from gallery
- **Sample Text**: Tap "Use sample" to load example text
- **Manual Input**: Type or paste text directly into the text area

### 2. Processing

- Tap "Process" to analyze the text
- The app will:
  - Extract key information (dates, amounts)
  - Generate a summary
  - Create a simplified version
  - Save to history automatically

### 3. Reading

- **View Modes**: Toggle between "Simplified" and "Original" text
- **Accessibility Controls**:
  - Adjust font size (14-28px)
  - Adjust line height (16-36px)
  - Adjust letter spacing (0-2)
  - Toggle high contrast mode
  - Enable color overlays with customizable tint and opacity

### 4. Asking Questions

- Type a question in the Q&A section
- Tap "Get answer" to retrieve relevant information
- Answers are based on token-based sentence matching

### 5. Text-to-Speech

- Tap "Play TTS" to start sentence-by-sentence playback
- Active sentence is highlighted in blue
- Progress indicator shows current sentence number
- Tap "Stop" to pause playback

### 6. History & Export

- View last 5 processed documents
- Tap any document to reopen it
- Tap "Export Summary" to share summary and key facts
- Tap "×" to delete a document

## Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and tooling
- **ML Kit**: Text recognition (Android)
- **Apple Vision**: Text recognition (iOS)
- **AsyncStorage**: Local data persistence
- **Expo Speech**: Text-to-speech synthesis
- **Atkinson Hyperlegible**: Accessible font

## Known Limitations

1. **OCR in Expo Go**: Real OCR requires a custom development build; Expo Go shows placeholder text
2. **Node Version**: Currently requires `--ignore-engines` flag for Node <20.19.4
3. **Summarization**: Uses simple sentence extraction; not AI-powered (see improvements.md)
4. **Q&A**: Basic token-based retrieval; no embeddings or advanced NLP

## Future Improvements

See [improvements.md](./improvements.md) for the complete roadmap, including:

- Local LLM integration for better summarization
- Enhanced OCR with bounding box mapping
- Multi-page document support
- Embedding-based Q&A retrieval
- OpenDyslexic font support
- Advanced TTS controls (pause/resume per sentence)
- Structure preservation (tables, lists)

## Development Notes

### Adding Native Modules

To add native modules (like ML Kit):

1. Install the package:

   ```bash
   corepack yarn add @react-native-ml-kit/text-recognition
   ```

2. Create a development build:
   ```bash
   npx expo prebuild
   npx expo run:ios  # or run:android
   ```

### Debugging

- Use React Native Debugger or Chrome DevTools
- Check console logs for OCR errors and storage operations
- Use Expo DevTools for performance monitoring

## License

See [LICENSE](./LICENSE) file for details.

## Contributing

This is a private project. For questions or suggestions, please refer to the improvements roadmap.

---

**Built with ❤️ for accessibility and reading support**
