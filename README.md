# ReadAble

A mobile assistive reading app that uses on-device OCR, text processing, and TTS to make printed text easier to read for people with dyslexia and reading difficulties.

## Project Overview

**ReadAble** is a mobile assistive reading application designed to help people with dyslexia and reading difficulties. It uses on-device OCR, text processing, and TTS to make printed text more accessible. The app is fully offline-first, prioritizing user privacy and accessibility.

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
  - Focus mode (one-line-at-a-time reading)
- **Text-to-Speech**: Sentence-by-sentence playback with pause/resume, seek, and active sentence highlighting
- **Q&A System**: Ask questions about processed documents with confidence scores and source citations
- **Document History**:
  - Automatic persistence with AsyncStorage
  - History list with document previews
  - Reopen previous documents
  - Export summaries and key facts
  - Delete documents
- **Privacy Controls**: Offline-first with explicit cloud opt-in

## Technology Stack

### Quick Answer

**Languages**: JavaScript (ES6+), JSX  
**Frameworks**: React Native 0.77.0, React 18.3.1, Expo SDK 54  
**Platforms**: iOS, Android, Web  
**Cloud Services**: None (fully offline-first)  
**Databases**: AsyncStorage (local storage only)  
**APIs**: ML Kit (Android), Apple Vision (iOS), Expo APIs (Camera, Speech, Sharing)  
**Other**: Yarn, Node.js, Metro Bundler, date-fns

### Detailed Technology Breakdown

#### Languages

- **JavaScript (ES6+)**: Primary development language
- **JSX**: React component syntax

#### Frameworks & Libraries

**Core Framework:**

- **React Native 0.77.0**: Cross-platform mobile framework
- **React 18.3.1**: UI library and component framework
- **Expo SDK 54.0.29**: Development platform and tooling

**UI & Styling:**

- **React Native StyleSheet**: Component styling
- **@expo-google-fonts/atkinson-hyperlegible**: Accessible font for dyslexia support

**State Management:**

- **React Hooks**: useState, useEffect, useCallback, useMemo for state and lifecycle management

#### Platforms

**Mobile Development:**

- **iOS**: Native support via Expo (requires Xcode for custom builds)
- **Android**: Native support via Expo (requires Android Studio for custom builds)
- **Web**: Browser support via Expo web

**Development Tools:**

- **Expo Go**: Quick testing on physical devices
- **Expo Dev Client**: Custom development builds for native modules

#### Native Modules & APIs

**OCR (Optical Character Recognition):**

- **@react-native-ml-kit/text-recognition**: ML Kit text recognition for Android
- **Apple Vision Framework**: Text recognition for iOS (via native bridge)
- **expo-image-picker**: Camera and gallery access
- **expo-camera**: Camera permissions and capture

**Text-to-Speech:**

- **expo-speech**: Cross-platform TTS synthesis

**Storage & Persistence:**

- **@react-native-async-storage/async-storage**: Local key-value storage
- **expo-file-system**: File system operations (for future use)

**Sharing & Export:**

- **expo-sharing**: Native sharing capabilities

**System Integration:**

- **expo-constants**: App constants and configuration
- **expo-status-bar**: Status bar styling

#### Data Processing

**Text Analysis:**

- **Custom NLP algorithms**: Tokenization, sentence splitting, TF-IDF scoring
- **Regex patterns**: Date extraction, currency detection, structure detection
- **date-fns**: Date manipulation and formatting

#### Build & Package Management

**Package Manager:**

- **Yarn 1.22.22**: Package management (via Corepack)
- **Node.js**: Runtime environment (20.15.0+ recommended, 20.19.4+ for full compatibility)

**Build Tools:**

- **Expo CLI**: Development server and build tools
- **Metro Bundler**: JavaScript bundler for React Native
- **Babel**: JavaScript transpilation

#### Architecture Patterns

**Design Patterns:**

- **Custom Hooks**: `useDocumentProcessor` for document management and TTS
- **Component Composition**: Modular UI components (AccessibilityControls, HighlightedText)
- **Utility Functions**: Separated concerns (textProcessing, storage, OCR)

**Data Flow:**

- **Unidirectional data flow**: React state management
- **Async/await**: Asynchronous operations (storage, OCR, TTS)
- **Callback patterns**: Event handling and state updates

#### Storage & Database

**Local Storage:**

- **AsyncStorage**: Key-value storage for document history
- **JSON serialization**: Document persistence format
- **No external database**: Fully offline-first architecture

#### APIs & Services

**Native APIs Used:**

- **Camera API**: Image capture (via expo-image-picker)
- **Media Library API**: Gallery access (via expo-image-picker)
- **Speech Synthesis API**: TTS (via expo-speech)
- **File System API**: Storage operations (via AsyncStorage)

**External Services:**

- **None**: Fully offline-first; no cloud dependencies
- **Future**: Optional cloud fallback for LLM (explicit opt-in only)

#### Accessibility Features

**Fonts:**

- **Atkinson Hyperlegible**: Primary accessible font
- **System fonts**: Fallback option

**Accessibility Standards:**

- **WCAG-inspired**: High contrast mode, adjustable text sizing, color overlays
- **Dyslexia-friendly**: Focus mode, sentence-by-sentence reading, customizable spacing

#### Security & Privacy

**Data Handling:**

- **Offline-first**: All processing on-device
- **No data transmission**: No network requests by default
- **Explicit opt-in**: Cloud features require user consent
- **Local storage only**: All data stored on device

## Prerequisites

- **Node.js**: Version 20.19.4 or higher (currently using `--ignore-engines` workaround for Node 20.15.0)
- **Yarn**: Package manager (configured via Corepack)
- **Expo CLI**: For running the development server
- **Mobile Device or Emulator**:
  - iOS: Requires Xcode and iOS Simulator (or physical device)
  - Android: Requires Android Studio and Android Emulator (or physical device)
  - Web: Works in modern browsers (including on macOS)

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
  - Enable focus mode for one-line-at-a-time reading

### 4. Asking Questions

- Type a question in the Q&A section
- Tap "Get answer" to retrieve relevant information
- Answers include confidence scores and source citations
- Answers are based on token-based sentence matching

### 5. Text-to-Speech

- Tap "Play TTS" to start sentence-by-sentence playback
- Active sentence is highlighted in blue
- Progress indicator shows current sentence number
- Use "Pause" to pause, "Resume" to continue, "Stop" to stop
- Click sentence numbers to seek to specific sentences

### 6. History & Export

- View last 5 processed documents
- Tap any document to reopen it
- Tap "Export Summary" to share summary and key facts
- Tap "×" to delete a document

## Production Readiness

✅ **Code Quality**: No linter errors, proper error handling  
✅ **Functionality**: All core features working  
✅ **Documentation**: Complete README, testing guide  
✅ **Architecture**: Clean, modular, maintainable

**Status**: Ready for hackathon submission

## Known Limitations

1. **OCR in Expo Go**: Real OCR requires a custom development build; Expo Go shows placeholder text
2. **Node Version**: Currently requires `--ignore-engines` flag for Node <20.19.4
3. **Summarization**: Uses simple sentence extraction; not AI-powered (see improvements.md)
4. **Q&A**: Basic token-based retrieval; no embeddings or advanced NLP

All limitations are documented and have workarounds available.

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

### Testing

- **Manual testing**: Via Expo Go and development builds
- See [testing-guide.md](./testing-guide.md) for detailed test procedures
- **Future**: Unit tests and E2E tests planned

### Deployment

**Build Targets:**

- **iOS**: App Store (via Expo Application Services or manual build)
- **Android**: Google Play Store (via Expo Application Services or manual build)
- **Web**: Static hosting (via Expo web export)

**Build Tools:**

- **Expo Application Services (EAS)**: Cloud build service (optional)
- **Expo CLI**: Local builds

## Demo Instructions

1. Install Expo Go on iPhone
2. Run `corepack yarn start --tunnel` on PC
3. Scan QR code
4. Use "Use sample" → "Process" to test
5. Try all features: TTS, Q&A, focus mode, history

See [testing-guide.md](./testing-guide.md) for detailed steps.

## License

See [LICENSE](./LICENSE) file for details.

## Contributing

This is a private project. For questions or suggestions, please refer to the improvements roadmap.

---

**Built with ❤️ for accessibility and reading support**

**Note**: This is an offline-first application with no cloud dependencies. All processing happens on-device for maximum privacy and accessibility.
