# Testing Guide

## Quick Test

1. Start: `corepack yarn start --tunnel`
2. Open Expo Go, scan QR code
3. Tap "Use sample" → "Process"
4. Test features: TTS, Q&A, focus mode, history

## Feature Tests

### Text Processing
- Use sample → Process
- Check highlighted dates (yellow) and amounts (green)
- Toggle Simplified/Original views

### Q&A
- Type "When is the due date?"
- Tap "Get answer"
- Verify answer appears

### TTS
- Tap "Play TTS"
- Verify sentence highlighting (blue)
- Test pause/resume/stop

### History
- Process multiple documents
- Verify history list
- Test reopen, export, delete

## Troubleshooting

- **Process fails**: Check console, try manual paste
- **Nothing appears**: Reload app, check errors
- **TTS fails**: Check volume, verify TTS permissions
