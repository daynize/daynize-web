# Daynize Voice Tutor

Modular Daynize voice tutor and standalone Gemini Live relay. Node.js 20 or newer is required. UI, audio processing and WebSocket management are separate modules. See [INTEGRATION.md](INTEGRATION.md) for Vanilla/React integration, protocol modes, architecture and the production backend checklist. The main website includes one isolated widget loader.

## Run

```sh
cd gemini-live-test
npm install
npm start
```

Before starting a conversation, set `GEMINI_API_KEY` in this folder's `.env` to your Google AI Studio API key, then restart the server. Never put the key in HTML or browser JavaScript. `.env` is ignored by Git and is not served over HTTP.

Open http://localhost:8080 in a current browser, open the floating voice tutor and start a conversation. Allow microphone access. Muting sends `audioStreamEnd` but keeps response playback alive. Ending the call or closing the modal releases audio resources. Headphones are recommended to avoid feedback. Microphone audio is sent to Google while enabled.

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

Public mode requires authentication on both HTTP and WebSocket requests. On its first launch it generates `.access-password`, a private local file containing `live:YOUR_PASSWORD`. Enter `live` as the browser login username and the value after the colon as the password. Do not use or share your Gemini API key as the login password. The password file is ignored by Git and never served. Authenticated HTTPS responses issue an HttpOnly, Secure, SameSite cookie for the same-origin WebSocket. Only the configured public origin and local origins are accepted.

Keep this Mac awake and keep both processes running. This is a temporary test URL, not permanent hosting: stopping or restarting the tunnel invalidates or changes it. Stop both processes with Ctrl+C to disable external access. Anyone you give the login credentials to can consume your Gemini API quota. Do not commit or publicly share the password or API key. To rotate the login password, stop the server, delete `.access-password`, and restart public mode.

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