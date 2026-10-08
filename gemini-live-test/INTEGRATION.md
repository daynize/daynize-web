# Daynize Voice Tutor Integration

## Module Ownership

| Module | Responsibility |
| --- | --- |
| `tutor-widget.mjs` / `spotlight-bar.css` | Shadow DOM UI, strict 84px horizontal bar, focus management, state, call controls, Canvas rendering |
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

Copy the browser modules, `spotlight-bar.css` and `icons/` into `public/voice-tutor/`, preserving their relative paths. Do not copy `.env`, `.access-password`, Node modules or server code into public assets. Load the widget once in the root layout with Next's Script component:

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
- Mic/output analysers drive two smoothed Siri-style curve waves. No fabricated activity is shown while disconnected or muted.
- Gemini's server-side `interrupted` event controls barge-in by default. Local energy-based interruption is opt-in via `AudioEngine({ localInterruption: true })`; loud background noise and speaker echo can otherwise cancel valid replies. Received chunks are not discarded based on a local speech flag. Use headphones for echo control.
- The widget displays counts of successfully submitted microphone frames and received PCM chunks. These are transport diagnostics, not a guarantee of speech recognition or audible device output. The speaker check plays a short local tone and resumes a suspended call AudioContext. A short greeting is requested on initial setup to verify the response path independently of speech recognition.
- The displayed timer counts unmuted connected time and pauses while muted. Muting keeps the Gemini connection open, and server session limits continue to use wall-clock time; end the call to close the upstream session.
- Muting disables the input track and clears the worklet's partial chunk. It sends `audioStreamEnd` while preserving speaker playback and the connection.
- Transient failures retry at 1s, 2s and 4s, at most three times per call. Fatal API/permission errors do not retry endlessly. Closing the modal cancels setup/retries immediately. Proxy reconnection opens a new Gemini conversation; prior conversation history is NOT restored. Direct-test mode can reuse Gemini session handles when available.

## Tutor Configuration

Automatic activity detection uses low start-of-speech sensitivity, high end-of-speech sensitivity, 200ms prefix padding and 450ms silence duration. This favors fewer background-triggered starts and earlier turn completion, but short pauses while thinking may end a turn sooner. The silence duration is not a total response-latency guarantee: continuous radio speech can still prevent silence detection and quieter users may need a closer microphone. Restart existing conversations to apply setup changes.

The proxy owns model and system instruction. The browser may select only `Kore` or `Puck`; the server validates this per WebSocket connection. Set `GEMINI_MODEL=gemini-2.5-flash-native-audio-latest` and optionally `GEMINI_VOICE=Kore` or `Puck` as the default for other clients. The original `gemini-2.0-flash-exp` constant is retained as the requested fallback, but was rejected by the actual Live API during testing. Use a currently supported Live audio model.

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

GitHub Pages publishes static browser assets only; pushing this repository does not start `server.js` or provision `api.daynize.co.kr`. The homepage directly specifies the temporary tunnel's WSS address in `data-endpoint`. No conversation-page URL, navigation event or second start click is used. Run the relay with `ALLOWED_ORIGINS=https://www.daynize.co.kr,https://daynize.co.kr` to accept those browser origins. Basic Auth has been removed; anyone who can reach the endpoint can consume API quota. Origin validation is not user authentication. The Mac and both server/tunnel processes must remain running; update the WSS address if the tunnel is recreated. After deploying the production backend, update `data-endpoint` to the real API service.

## Spotlight Controls

The entire closed-drawer modal is a single 84px-high horizontal capsule, 90% viewport width with a strict 720px maximum. The old vertical/Finder CSS has been removed and replaced by `spotlight-bar.css`. Its dark glass background is rgba(30,32,34,0.88), with 28px blur and fully rounded ends. `Daynize labs` replaces the traffic-light controls. The right tray always uses one flex row with inset spacing; the 64px orb remains on the left and the waveform fills the middle. Captions and preferences open as mutually exclusive anchored panels outside the bar; warnings likewise do not change its fixed height. Local-only `http://localhost:8081/?preview=design` automatically opens the visual preview without microphone permission or WebSocket connection. Its waveform animation is a design demonstration; the normal local URL uses real audio and one-click voice functionality.

## Session Safety

`session-safety.mjs` checks monotonic elapsed time independently of animation rendering. The microphone analyser's unfiltered time-domain RMS is sampled every 100ms: RMS at least 0.012 resets the last-sound timestamp. This is volume detection, not speech recognition; radio/noise can reset it and extremely quiet speech may not. After 20 seconds without input the widget shows a 10-second countdown; renewed sound hides it. At 30 seconds the WebSocket, media tracks, playback queue and timers are closed, with an explanation retained in the modal. This includes mute and minimized states; AI output does not reset the microphone-silence clock. The ten-minute limit uses wall-clock elapsed time from call start, including permission waiting, mute and reconnect, not the displayed unmuted timer. At the limit it shows `오늘의 튜터링 시간이 완료되었습니다!` and ends the call. A server-side ten-minute connection timer is a backstop when browser timers are throttled; repeated new connections still need per-user gateway quota control. Visibility changes recheck deadlines immediately. Browser silence checks cannot enforce deadlines while the browser process is fully suspended.

The left-side avatar is a fixed 64px Canvas ambient orb. A separate renderer composites emerald/gold clouds and rotating light ribbons with a capped 0.7 final alpha; the central waveform uses a different Canvas. Its 0.24Hz breathing moves the radius only 0.55px, input/output ripple amplitude is bounded at 2.4px, and frame-time exponential damping (0.65-second time constant) smooths volume and amber state transitions. Internal rotation varies from 0.45 to 0.88 radians/second with voice activity and state, with soft activity-dependent glow capped at 0.345. Faint microphone-driven mist is capped at 0.035 opacity without particle trails. The thin 12-layer waveform uses real microphone/output time-domain RMS with a 0.003 noise floor and a 45ms attack / 180ms release, rather than a heavily smoothed frequency average. Frequency analysers retain smoothingTimeConstant 0.94 for other diagnostics; PCM capture and turn detection are unchanged. Reduced-motion preferences freeze rotation, breathing and ripples while preserving gradual state colors. Rendering uses the widget's existing RAF and pauses when closed or internally minimized.

The floating Spotlight bar lives in the widget's Shadow DOM as `#spotlight-modal`, keeping site styles isolated. It is hidden when closed and receives `active` when opened; native dialog provides focus containment. The floating button opens it and starts microphone initialization and Gemini WebSocket setup concurrently in the same user gesture. PCM streaming waits for both microphone readiness and Gemini `setupComplete`. Permission denial or close during setup cleans up late microphone tracks and closes the connection. Only failures show a retry button.

The right-side end icon, backdrop click and Escape close the session and preserve the page URL/scroll position. The former traffic-light close/minimize/expand buttons are no longer shown. Internal minimize/restore methods remain covered by lifecycle tests; a programmatically minimized call continues microphone transmission until muted or ended. The capsule stays 84px high when captions or settings are opened.

The tray controls microphone mute, speaker-only Gain mute, a live transcription drawer, and preferences. Gemini input/output transcription is requested in setup and safely rendered as text; the drawer holds at most 100 rows and 6000 characters per row in memory only. It is not saved to localStorage and is lost on page unload. Transcription can be delayed or inaccurate and is not a verbatim guarantee. Changing voice uses the explicit apply button, which closes the current session and opens a new one; conversation context is not retained across this change. Playback speed is 0.8-1.2x using Web Audio playbackRate (pitch changes with speed); changing it clears queued speech so rates do not desynchronize the playback clock. The settings drawer also retains the local speaker-check tone.

The implementation is integration-ready, not an already provisioned `api.daynize.co.kr` service. A temporary Cloudflare tunnel is not production hosting. Before public rollout:

1. Deploy the Node relay behind a TLS reverse proxy at `api.daynize.co.kr`; retain loopback-only binding and forward HTTP/WebSocket upgrades to port 8080. Set the upstream Host header to `api.daynize.co.kr` and preserve Origin. Ensure proxy read timeouts allow long-lived calls.
2. Set `PUBLIC_ORIGIN=https://api.daynize.co.kr` and `ALLOWED_ORIGINS=https://www.daynize.co.kr,https://daynize.co.kr`. Basic login and password cookies are not implemented. Add application session verification for HTTP and upgrade requests before production rollout.
3. Integrate `createRelayServer({ publicOrigin, allowedOrigins, authorizeRequest, ... })` in your backend. Without this optional hook, requests do not require authentication. `authorizeRequest(request)` must synchronously return boolean `true` only for a valid authorized session. Errors, promises and all other values fail closed. Browser WebSocket cannot set custom Authorization headers; use properly scoped Secure/HttpOnly cookies or a separately implemented, validated short-lived ticket flow. Do not implement a hook that trusts a client-supplied user ID.
4. Enforce per-user quotas and gateway rate limiting before upgrade. The relay's default eight concurrent calls, 10-minute session limit, 30-second heartbeat and payload/buffer bounds are single-process safety caps, not per-user billing controls. Supply `maxConnections` and `maxSessionMs` to customize them. Add shared limits when scaling horizontally.
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