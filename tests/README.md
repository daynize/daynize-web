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

Episodes 03 (Yesterday), 04 (Dancing Queen), 05 (Hotel California) and 09
(Country Roads) have no supplied original-song preview. Their `previewUrl`
is `null`: cards and the modal retain a dimmed disabled play button and show
`저작권 문제로 샘플곡을 재생할 수 없습니다.`. The modal's seek control is also
disabled. Learning text, practice audio and quizzes remain available. Other
missing/invalid preview URLs use the same UI. Network errors on existing URLs
retain a separate loading-error message, not an unsupported copyright claim.

The two remaining SoundHelix URLs (episodes 06–07) are demonstration music,
not recordings or covers of the featured artists. Their labels disclose this.
Episode 08 uses Apple's official Carpenters preview because the supplied
SoundHelix Song 6 URL timed out during validation. Its label distinguishes
the original preview from demonstration music. Music-service links lead
to the original song or its search results.

The 21 local M4A files contain original practice sentences, not song lyrics.
Regenerate them on macOS with the Samantha English voice installed:

```sh
node scripts/generate-pop-audio.mjs
```

To regenerate only selected episodes:

```sh
node scripts/generate-pop-audio.mjs pop-03 pop-04 pop-05 pop-09
```

The filename is the episode ID plus the one-based practice sentence index.
Each listening quiz reuses the recording whose text matches `audioText`.
Regenerate the files when changing practice sentence text or order.