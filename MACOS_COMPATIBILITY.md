# macOS Compatibility

## Status

**Expo SDK 54 does NOT support native macOS apps.**

Supported platforms:
- ✅ iOS (iPhone/iPad)
- ✅ Android
- ✅ Web (browsers)

## macOS Options

### Web Version (Recommended)

```bash
corepack yarn start --web
```

Works: Text processing, TTS (Web Speech API), history, accessibility controls, Q&A

Limited: Camera/OCR (needs web-based solution like Tesseract.js)

### iOS on Apple Silicon

```bash
npx expo run:ios
```

Works on M1/M2/M3 Macs, but designed for iPhone/iPad, not macOS desktop.

## What Won't Work

- Native macOS desktop app (requires react-native-macos fork)
- ML Kit OCR (Android-only)
- Native macOS file picker

## Recommendation

Use web version for macOS - provides 95% of functionality.
