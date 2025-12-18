# How to Test ReadAble on Mobile

## Quick Test Steps

1. **Start the app** (if not already running):

   - On your PC: `corepack yarn start --tunnel`
   - Open Expo Go on your iPhone
   - Scan the QR code

2. **Load sample text**:

   - Tap the **"Use sample"** button
   - You should see text appear in the text area

3. **Process the text**:

   - Tap the **"Process"** button (below the text area)
   - Wait a moment - you'll see a loading spinner
   - The processed document should appear in section 2 below

4. **What you should see after processing**:
   - **Section 2**: The text appears with "Simplified" and "Original" toggle buttons
   - **Section 3**: A summary appears
   - **Section 4**: You can ask questions
   - **Section 5**: TTS playback controls
   - **Section 6**: History list with your document

## Testing Each Feature

### Text Processing

- ✅ Tap "Use sample" → Tap "Process"
- ✅ You should see highlighted dates (yellow) and amounts (green)
- ✅ Toggle between "Simplified" and "Original" views

### Q&A

- ✅ Type a question like "When is the due date?"
- ✅ Tap "Get answer"
- ✅ You should see an answer appear

### TTS (Text-to-Speech)

- ✅ Tap "Play TTS"
- ✅ You should hear the text being read
- ✅ Watch the sentence highlighting (blue background)
- ✅ Tap "Stop" to pause

### History

- ✅ Process another document (paste different text, tap Process)
- ✅ Scroll to section 6 - you should see multiple documents
- ✅ Tap any document to reopen it
- ✅ Tap "Export Summary" to share
- ✅ Tap "×" to delete

## Troubleshooting

**If "Process" doesn't work:**

- Check the console/terminal for errors
- Make sure text is in the input area
- Try pasting text manually instead of "Use sample"

**If nothing appears after processing:**

- Check if you see any error messages
- Try reloading the app (shake phone → Reload)
- Check the browser console if testing on web

**If TTS doesn't work:**

- Make sure your phone volume is up
- Check if other apps can use TTS
- On web, TTS may not work (use mobile for full features)

## Expected Sample Text Output

When you process the sample text, you should see:

- **Dates highlighted**: "March 12, 2025", "March 10, 2025"
- **Amounts highlighted**: "$12.50"
- **Summary**: First 2 sentences or first 40 words
- **Simplified text**: Text with commas/semicolons replaced, some words removed
