# Manual test pass

Run `corepack yarn test` first. Then go through this on at least one phone (Expo Go or a dev build) and in a browser (`corepack yarn web`).

## Add text
- **Try an example**, then **Open in reader**. The page scrolls to the reader.
- **Choose a photo** with printed text. The text box fills with the recognized text, with wrapped lines joined. In Expo Go you get a message saying scanning needs a development build.
- Choosing a blank photo shows "No text found" and leaves the text box unchanged.
- **Open in reader** stays disabled while the text box is empty.

## Reader
- In the example text, `March 12, 2025`, `6:00 PM`, `5:00 PM` and `March 10, 2025` are yellow and `12$` is green. Nothing else is marked.
- Switch between **Simplified** and **Original**: the marks stay on the right words in both.
- **Aa** opens the reading settings. Change the font (Atkinson, Lexend, System), text size, line spacing, letter spacing and background tint, then restart the app. All of them are kept.
- **High contrast** makes every card black on white with bold outlines.
- **Focus mode** shows one sentence with "Sentence x of y" and Previous and Next buttons.

## Listen
- Tap the second sentence. Speech starts there and that sentence is highlighted.
- Listen to a few sentences, press **Stop**, then close and reopen the app: the button now says **Continue** and starts from where you stopped; **From the start** restarts. Reading to the end resets it.
- **Pause**, then **Resume**: the same sentence starts again from its beginning.
- ⏮ and ⏭ move one sentence. **Stop** clears the highlight.
- Change the voice speed while listening. The next sentence uses the new speed.
- With focus mode on, the shown sentence follows the voice.
- Switching Simplified/Original while listening stops the speech.

## Summary and Ask
- The summary shows the key details as chips, in the order they appear in the text. **Share** opens the share sheet (on web without one, it copies to the clipboard).
- Ask "How much are late fees?" and get the sentence with `12$`. Ask "Who is the president?" and get "I couldn't find that…".
- **Read aloud** speaks the answer without highlighting the reader. **Copy** shows "Copied ✓" for about 2 seconds.

## Saved texts
- Opening the same text twice does not create a duplicate.
- Each item shows the first sentence and how long ago it was saved, and the open text is marked.
- ✕ asks before deleting. **Clear all** asks before deleting everything. On the web, both use the browser's confirm dialog.
- With more than 5 saved texts, **Show all** and **Show fewer** appear.

## Accessibility
- With VoiceOver or TalkBack, every button, switch and color swatch announces a name and state, and the reading progress and answers are announced.
- On the web, tabbing through the page shows a clear focus ring on every button.
