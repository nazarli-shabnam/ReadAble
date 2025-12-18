# Expo Go (quick test on phone)

1. Install Expo Go from the App Store (iPhone).
2. On your PC, install deps (once):
   - `corepack yarn install --ignore-engines`
3. Start the dev server with a tunnel (best for phone):
   - `corepack yarn start --tunnel`
4. In the terminal/Expo DevTools, scan the QR code with Expo Go.
5. The app opens on your phone.

Notes

- Camera/OCR: Only a placeholder in Expo Go; real OCR needs a custom dev build.
- TTS may be limited on web/Go; full fidelity in a dev build.
- If the tunnel is slow, try LAN (same Wi‑Fi) and choose "LAN" in Expo DevTools.
- If you see a "feature flag" error, restart the dev server (the new architecture is disabled in app.json).
