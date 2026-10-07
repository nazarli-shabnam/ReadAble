# ReadAble

A reading aid for people with dyslexia. Scan or paste a text, read it in a calmer layout, listen to it sentence by sentence, and ask questions about it. Everything runs on the device: no account, no server, nothing uploaded.

Built with Expo SDK 54 (React Native 0.81, React 19). Runs on iOS, Android and the web.

## What it does

- **Add text**: scan with the camera, choose a photo, paste, or type. On-device OCR uses ML Kit (Android) and Apple Vision (iOS) in native builds, and tesseract.js on the web.
- **Reader**
  - Simplified view: plainer words ("utilize" becomes "use"), filler words like "furthermore" removed, long sentences split. Dates, times and amounts are never altered.
  - Dates and times are marked in yellow and amounts in green.
  - Reading settings: Atkinson Hyperlegible, Lexend or the system font; text size; line spacing (1.2–2.5×); letter spacing; a colored background tint; high contrast; focus mode (one sentence at a time); a reading ruler (dims all but two lines).
- **Listen**: tap any sentence to hear the text from there. The sentence being read is highlighted, focus mode follows along, and you can pause, resume, skip and change the voice speed.
- **Summary**: the most central sentences, the key dates and amounts, and a reading-time estimate. Share it or copy it.
- **Ask**: type a question to find the sentence that answers it, then read it aloud or copy it. If nothing in the text matches, it tells you so rather than guessing.
- **Saved texts**: the last 50 texts are kept on the device. Open, delete or clear them.

All reading settings are saved on the device.

## Getting started

Requires Node.js 20.19.4+ and Yarn via Corepack.

```bash
corepack yarn install
corepack yarn web       # open in the browser
corepack yarn start     # dev server for Expo Go / dev builds
```

### Running on a phone

- **Expo Go** (quickest): run `corepack yarn start` and scan the QR code. Everything works except scanning text from photos, which needs native modules that Expo Go doesn't include. If your phone isn't on the same network, use `corepack yarn start --tunnel`.
- **Development build** (full features, including OCR):
  ```bash
  npx expo prebuild
  corepack yarn android   # or: corepack yarn ios (macOS + Xcode)
  ```
  iOS builds target iOS 15.5 or later, which ML Kit requires; this is set in `app.json`.

### Web notes

- OCR on the web downloads the tesseract.js engine and English language data (about 10 MB) from a CDN the first time you scan. The browser caches them after that, and your images are processed in the browser and never uploaded.
- Text-to-speech uses the browser's Web Speech API, so the available voices depend on the browser and OS.
- Sharing falls back to copying to the clipboard where the browser has no share sheet.
- On a Mac, the web version is the way to run ReadAble. Expo doesn't build native macOS apps.

## Development

```bash
corepack yarn test            # Jest (jest-expo preset)
corepack yarn test:coverage
npx expo install --check      # dependency versions match the SDK
```

See [testing-guide.md](./testing-guide.md) for a manual test pass and [improvements.md](./improvements.md) for ideas that aren't built yet.

### Project layout

```
App.js                      state wiring and screen layout
src/
  theme.js                  light and high-contrast color tokens, font faces
  components/               ui.js primitives + one component per card
  hooks/
    useDocumentProcessor.js active document and saved history
    useSpeech.js            sentence-by-sentence text-to-speech
    useSettings.js          persisted reading preferences
  utils/
    textProcessing.js       sentences, dates/amounts, simplify, summary, Q&A
    storage.js              AsyncStorage: saved texts and settings
    ocr.js / ocr.web.js     native (ML Kit) and web (tesseract.js) OCR
    dialogs.js              alerts and confirmations that also work on web
  constants/                settings defaults and limits, sample text
```

Saved texts store only `{ id, rawText, createdAt }`. Everything else (sentences, summary, simplified text) is derived when a text is opened, so improvements to the text processing apply to texts saved earlier too.

## Limitations

- Text processing is rule-based and English-only. Summaries are extractive, and Q&A matches keywords rather than meaning.
- Voices and speech quality depend on the device.

## License

Apache 2.0. See [LICENSE](./LICENSE).
