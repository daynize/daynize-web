# Daynize Voice Tutor

Modular Daynize voice tutor and standalone Gemini Live relay. Node.js 20 or newer is required. UI, audio processing and WebSocket management are separate modules. See [INTEGRATION.md](INTEGRATION.md) for Vanilla/React integration, protocol modes, architecture and the production backend checklist. The main website includes one isolated widget loader.

## Run

```sh
cd gemini-live-test
npm install
npm start
```

Before starting a conversation, set `GEMINI_API_KEY` in this folder's `.env` to your Google AI Studio API key, then restart the server. Never put the key in HTML or browser JavaScript. `.env` is ignored by Git and is not served over HTTP.

Open http://localhost:8080 in a current browser and click the floating voice button once. Spotlight opens inline and immediately begins microphone permission and Gemini connection without page navigation or another start click. Muting sends `audioStreamEnd` but keeps response playback alive. Speaker mute, live captions, voice and playback speed are available in the icon tray. Ending the call or closing the modal releases audio resources. Headphones are recommended to avoid feedback. Microphone audio is sent to Google while enabled.

The server listens only on the loopback interface, at port 8080. Both HTTP assets and `ws://localhost:8080/ws/gemini-live` use that port (the legacy `/` WebSocket path also works). Open the served URL, not the HTML as a local file: AudioWorklet and microphone capture need a secure context (localhost qualifies). Port 8080 must be free.

## Temporary External Access

External microphone access requires HTTPS. The frontend uses the current page host and upgrades its WebSocket to WSS automatically on HTTPS.

Start the temporary tunnel in one terminal:

```sh
.tools/cloudflared tunnel --url http://127.0.0.1:8080 --no-autoupdate
```

Then start the server in another terminal with the exact HTTPS URL printed by the tunnel:

```sh
PUBLIC_ORIGIN=https://YOUR-TUNNEL.trycloudflare.com node server.js
```

Public mode no longer uses Basic Auth or password cookies. No login is required. `LIVE_ACCESS_PASSWORD` and any existing `.access-password` file are ignored by the server. Private files remain excluded from Git and are not served. WebSocket origins and hosts are still checked, but origin checks are not authentication: non-browser clients can forge headers.

Keep this Mac awake and keep both processes running. This is a temporary test URL, not permanent hosting: stopping or restarting the tunnel invalidates or changes it. Stop both processes with Ctrl+C to disable external access. Anyone who can reach the URL can consume your Gemini API quota. The eight-connection and 15-minute session caps are not per-user billing controls. Configure gateway rate limits and API budgets before broad sharing. Never publish your API key. Production application authentication can still be supplied through `authorizeRequest`.

## Model Compatibility

The requested defaults are preserved:

- Endpoint: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=...`
- Model: `models/gemini-2.0-flash-exp`
- Setup: `generationConfig.responseModalities: ["AUDIO"]`

An experimental model may no longer be available to your account. If Gemini rejects this model, replace `GEMINI_MODEL` in `.env` with a currently available Live audio model from Google's documentation and restart. The app surfaces API errors and session close reasons; it does not silently change models. Consult https://ai.google.dev/gemini-api/docs/models and https://ai.google.dev/api/live for current availability and protocol information.

## Audio And Tests

The AudioWorklet resamples the browser's actual input rate to mono 16 kHz, then sends 100 ms chunks of signed 16-bit little-endian PCM as Base64. Capture starts streaming only after `setupComplete`. Returned PCM defaults to 24 kHz and is scheduled sequentially using Web Audio buffers. An `interrupted` event clears pending playback for barge-in.

```sh
npm run check
npm test
npm run test:browser
```

Tests use a local mock Gemini WebSocket, not a real API key or billable session. They check setup ordering, bidirectional audio relay, audio stream end, disconnect cleanup, origin checks, private file protection, missing-key errors, PCM encoding and resampling at 16 / 44.1 / 48 kHz. A live conversation still requires a valid key, a supported model, microphone permission and manual listening verification.