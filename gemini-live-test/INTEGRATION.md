# Daynize Voice Tutor Integration

## Module Ownership

| Module | Responsibility |
| --- | --- |
| `tutor-widget.mjs` / `tutor.css` | Shadow DOM UI, native modal focus management, state, call controls, Canvas rendering |
| `audio-engine.mjs` | Microphone lifecycle, analysers, mute, PCM playback scheduling and interruption |
| `pcm-worklet.mjs` / `audio.mjs` | Off-main-thread mono resampling, sustained voice detection, PCM16 little-endian conversion |
| `live-service.mjs` | WebSocket setup, message parsing, interruption, bounded retries and direct-test configuration |
| `daynize-tutor.mjs` | One-time automatic mount and deployment endpoint selection |
| `server.js` | Server-only Gemini credentials, tutor setup, auth, origin checks, upstream relay and session limits |

The homepage includes one loader script. All widget styles are isolated in Shadow DOM; the page's existing typography, layout and handlers remain intact. The specified cream/forest palette, 16-24px corners, 48-64px touch targets and reduced-motion support are widget-scoped.

## Vanilla JavaScript

```html
<script type="module"
  src="/gemini-live-test/daynize-tutor.mjs"
  data-daynize-tutor
  data-endpoint="wss://api.daynize.co.kr/ws/gemini-live"></script>
```

Or mount explicitly when you need lifecycle control:

```js
import { mountVoiceTutor } from './gemini-live-test/tutor-widget.mjs';

const widget = mountVoiceTutor({
  endpoint: 'wss://api.daynize.co.kr/ws/gemini-live',
  mode: 'proxy',
  protocol: 'audio',
  maxRetries: 3
});

widget.addEventListener('tutor-state', event => {
  console.log(event.detail.state);
});

// On application teardown:
widget.remove();
```

Do not use both mounting methods on the same page. Removing the element closes its session, stops all media tracks, closes its AudioContext, clears timers and cancels rendering.

## React / Next.js

Copy the browser modules, `tutor.css` and `icons/` into `public/voice-tutor/`, preserving their relative paths. Do not copy `.env`, `.access-password`, Node modules or server code into public assets. Load the widget once in the root layout with Next's Script component:

```tsx
import Script from 'next/script';

export function VoiceTutorLoader() {
  return (
    <Script
      id="daynize-voice-tutor"
      type="module"
      src="/voice-tutor/daynize-tutor.mjs"
      strategy="afterInteractive"
      data-daynize-tutor
      data-endpoint="wss://api.daynize.co.kr/ws/gemini-live"
    />
  );
}
```

The modules do not access browser globals until loaded in the browser. The custom element requires no React runtime. For route-scoped React use, mount explicitly in a client-side effect and call `widget.remove()` in its cleanup. Render a single widget instance per page to avoid simultaneous calls.

## Protocol And Audio

- Default input is current Gemini JSON: `realtimeInput.audio` with `mimeType: "audio/pcm;rate=16000"` and Base64 data.
- Select `protocol: "media_chunks"` for the requested legacy `realtime_input.media_chunks` / `mime_type` wire format. The bundled proxy normalizes either format to current Gemini input. Direct compatibility depends on the chosen API version.
- Resampling uses the actual AudioContext rate, not the requested microphone constraint. AudioWorklet emits 1600 samples per chunk (100 ms, 3200 PCM bytes). Frames are never sent before `setupComplete` and are dropped, not stored, during reconnection.
- Output uses signed mono PCM16 at 24kHz unless a valid rate is supplied in its MIME type. Sources are scheduled on the AudioContext clock, contiguous after a 40ms initial cushion. The first edge and interruptions have short gain ramps. Queue duration is bounded at 20 seconds to avoid unbounded latency/memory. Network underruns can still cause gaps; there is no claim of jitter-free delivery under packet stalls.
- Mic/output analysers drive two actual frequency-bar rows. No fabricated activity is shown while disconnected or muted.
- Gemini's server-side `interrupted` event controls barge-in by default. Local energy-based interruption is opt-in via `AudioEngine({ localInterruption: true })`; loud background noise and speaker echo can otherwise cancel valid replies. Received chunks are not discarded based on a local speech flag. Use headphones for echo control.
- The widget displays counts of successfully submitted microphone frames and received PCM chunks. These are transport diagnostics, not a guarantee of speech recognition or audible device output. The speaker check plays a short local tone and resumes a suspended call AudioContext. A short greeting is requested on initial setup to verify the response path independently of speech recognition.
- The displayed timer counts unmuted connected time and pauses while muted. Muting keeps the Gemini connection open, and server session limits continue to use wall-clock time; end the call to close the upstream session.
- Muting disables the input track and clears the worklet's partial chunk. It sends `audioStreamEnd` while preserving speaker playback and the connection.
- Transient failures retry at 1s, 2s and 4s, at most three times per call. Fatal API/permission errors do not retry endlessly. Closing the modal cancels setup/retries immediately. Proxy reconnection opens a new Gemini conversation; prior conversation history is NOT restored. Direct-test mode can reuse Gemini session handles when available.

## Tutor Configuration

Automatic activity detection uses low start-of-speech sensitivity, high end-of-speech sensitivity, 200ms prefix padding and 450ms silence duration. This favors fewer background-triggered starts and earlier turn completion, but short pauses while thinking may end a turn sooner. The silence duration is not a total response-latency guarantee: continuous radio speech can still prevent silence detection and quieter users may need a closer microphone. Restart existing conversations to apply setup changes.

The proxy owns model, voice and system instruction, not the browser. Set `GEMINI_MODEL=gemini-2.5-flash-native-audio-latest` and optionally `GEMINI_VOICE=Kore` or `Puck` in the server environment. The original `gemini-2.0-flash-exp` constant is retained as the requested fallback, but was rejected by the actual Live API during testing. Use a currently supported Live audio model.

Both modes use AUDIO response modality and the requested warm, patient, bilingual senior-tutor instruction. System instructions guide the model but cannot guarantee its responses; avoid medical, financial or other sensitive advice workflows without additional guardrails.

## Direct API Testing Only

```js
const widget = mountVoiceTutor({
  mode: 'direct',
  endpoint: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
  apiKey: temporaryTestKey,
  model: 'gemini-2.5-flash-native-audio-latest',
  voice: 'Puck'
});
```

This deliberately puts a key in browser memory and the WebSocket URL. Use only an ephemeral/restricted disposable test credential in a private local session. Never put a long-lived key in public source, localStorage, committed configuration, URLs you share or a production widget. Production uses the proxy; no API key reaches the browser.

## Production Backend Checklist

GitHub Pages publishes static browser assets only; pushing this repository does not start `server.js` or provision `api.daynize.co.kr`. The homepage loader uses `data-test-url` to derive the temporary tunnel's WSS endpoint, opening the tutor in the current page without navigation. Run the relay with `ALLOWED_ORIGINS=https://www.daynize.co.kr,https://daynize.co.kr` to accept those browser origins. Basic Auth has been removed; anyone who can reach the endpoint can consume API quota. Origin validation is not user authentication. The Mac and both server/tunnel processes must remain running; update the URL if the tunnel is recreated. After deploying the production backend, remove `data-test-url` and use `data-endpoint` for the real API service.

## Finder Window Controls

The 18px floating window uses native dialog focus containment and a translucent title bar. Red closes the dialog and releases the voice session; clicking the backdrop or pressing Escape does the same. Yellow minimizes to the bottom-right launcher without stopping audio or timers; the launcher shows the current call state and restores the same session. Green toggles a larger in-page window, not browser fullscreen. Input/output curves are driven by smoothed analyser RMS levels; idle curves remain flat and reduced-motion preferences suppress wave phase motion. Minimized calls continue transmitting microphone audio until muted or ended.

The implementation is integration-ready, not an already provisioned `api.daynize.co.kr` service. A temporary Cloudflare tunnel is not production hosting. Before public rollout:

1. Deploy the Node relay behind a TLS reverse proxy at `api.daynize.co.kr`; retain loopback-only binding and forward HTTP/WebSocket upgrades to port 8080. Set the upstream Host header to `api.daynize.co.kr` and preserve Origin. Ensure proxy read timeouts allow long-lived calls.
2. Set `PUBLIC_ORIGIN=https://api.daynize.co.kr` and `ALLOWED_ORIGINS=https://www.daynize.co.kr,https://daynize.co.kr`. Basic login and password cookies are not implemented. Add application session verification for HTTP and upgrade requests before production rollout.
3. Integrate `createRelayServer({ publicOrigin, allowedOrigins, authorizeRequest, ... })` in your backend. Without this optional hook, requests do not require authentication. `authorizeRequest(request)` must synchronously return boolean `true` only for a valid authorized session. Errors, promises and all other values fail closed. Browser WebSocket cannot set custom Authorization headers; use properly scoped Secure/HttpOnly cookies or a separately implemented, validated short-lived ticket flow. Do not implement a hook that trusts a client-supplied user ID.
4. Enforce per-user quotas and gateway rate limiting before upgrade. The relay's default eight concurrent calls, 15-minute session limit, 30-second heartbeat and payload/buffer bounds are single-process safety caps, not per-user billing controls. Supply `maxConnections` and `maxSessionMs` to customize them. Add shared limits when scaling horizontally.
5. Provision secrets outside the static web deployment, track aggregate usage without recording raw audio/secrets, and establish a retention/privacy notice. Apply CSP (`connect-src` for the API, `script-src`/`worker-src` for the module worklet and appropriate image/style/font sources), Permissions-Policy for the microphone, HTTPS and monitoring at the gateway.
6. Complete real-device listening/echo/latency testing on Safari/iOS, Android and senior users' intended microphones; the automated browser coverage is Chromium, not certification of every platform. Web Audio resumes from a user gesture; browsers may suspend it when backgrounded.

## Verification

```sh
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

The browser test server uses port 8091 and mocked WebSockets/audio input; tests do not consume Gemini quota. It exercises a real AudioContext and AudioWorklet. Screenshots are written to ignored `test-results/`. Real Gemini setup was separately verified with the configured model, tutor instruction and Kore voice. Audible quality remains a manual real-device check.