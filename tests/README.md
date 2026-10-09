# Pop & Culture Checks

Run from the repository root:

```sh
node --test tests/pop-culture.test.mjs
node --test tests/pop-culture.browser.mjs
```

The browser check uses the existing Playwright installation in
`gemini-live-test/node_modules`. If needed, run `npm ci` and
`npx playwright install chromium` inside `gemini-live-test` first.
It starts and stops an isolated static server, checks desktop and mobile
layouts, plays the local sentence recordings, and prints screenshot paths.
External Unsplash images must be reachable for the image assertions.

## Audio

The six SoundHelix URLs are demonstration music, not recordings or covers
of the featured artists. This distinction is shown on cards and in the modal.
Episode 08 uses Apple's official Carpenters preview because the supplied
SoundHelix Song 6 URL timed out during validation. Its label distinguishes
the original preview from demonstration music. Music-service links lead
to the original song or its search results.

The 21 local M4A files contain original practice sentences, not song lyrics.
Regenerate them on macOS with the Samantha English voice installed:

```sh
node scripts/generate-pop-audio.mjs
```

The filename is the episode ID plus the one-based practice sentence index.
Each listening quiz reuses the recording whose text matches `audioText`.
Regenerate the files when changing practice sentence text or order.