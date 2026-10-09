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

External microphone access requires HTTPS. Localhost and tunnel pages use the current page host and upgrade WebSocket to WSS automatically on HTTPS. Production pages default to `wss://api.daynize.co.kr/ws/gemini-live`, which must be separately deployed.

### Existing Named Tunnel

macOS login autostart is installed with two user LaunchAgents,
`kr.co.daynize.relay` and `kr.co.daynize.tunnel`. They run independently of VS Code
terminals, start after this user logs in, and restart after process exit.

```sh
npm --prefix gemini-live-test run autostart:status
npm --prefix gemini-live-test run autostart:install
npm --prefix gemini-live-test run autostart:stop
```

`install` enables/reloads both services; `stop` stops and disables both until
reinstalled. Do not run the manual commands below while LaunchAgents are active.
Plists are under `~/Library/LaunchAgents`, and stdout/stderr logs are under
`~/Library/Logs/Daynize`. Tokens remain in the private `.env`, not the plists.
Moving the project or Node executable requires reinstalling. This is login
autostart, not a system daemon: it does not serve before login, during sleep,
or while the Mac is powered off. Actual reboot testing is not automated;
process termination/restart and public Gemini recovery were verified.

Run the existing relay and Tunnel in separate terminals from the repository root:

```sh
npm --prefix gemini-live-test run start:relay
npm --prefix gemini-live-test run start:tunnel
```

`start:relay` sets the public origin, permitted website origins and public WSS URL
for `api.daynize.co.kr`, using the existing private Gemini settings. `start:tunnel`
uses the bundled cloudflared executable and existing credentials only; it does
not create a new tunnel, temporary hostname or DNS record. Set `TUNNEL_TOKEN`
in the private `.env` directly, or `CLOUDFLARE_TUNNEL_CONFIG` to an existing
locally managed Tunnel configuration file. Never commit credentials or send
them in chat. The token is passed through the child environment, not command arguments.

In the existing Cloudflare Tunnel dashboard, map public hostname
`api.daynize.co.kr` to `http://localhost:8080`. If the connector runs on another
machine, localhost must refer to the machine running this Node relay. Set the
HTTP Host Header override to `api.daynize.co.kr`. The corresponding proxied DNS
CNAME is `api` -> `<existing-tunnel-UUID>.cfargotunnel.com`, normally created by
the dashboard. Do not put a URL, port, private IP or workers.dev hostname into
that Tunnel CNAME. Both processes must stay running. A Pages deployment alone
cannot run `server.js`, create this record or authenticate the connector.

The frontend already defaults to `wss://api.daynize.co.kr/ws/gemini-live`, so no
replacement URL is necessary once the existing Tunnel route is active. Verify
DNS and Gemini setup before claiming public voice connectivity. A successful
setup/heartbeat probe alone does not verify audible microphone conversation.
Set `NEXT_PUBLIC_WS_URL` (or `WS_URL`) in the relay environment to override the public endpoint. The loader reads only this public setting from `/runtime-config.json`; API keys remain private. On static hosts such as GitHub Pages, configure `globalThis.DAYNIZE_CONFIG.wsUrl` before the loader or set its `data-endpoint` attribute, since Node environment variables are not available in plain browser modules. A stable domain/named tunnel is required for production: retries cannot restore an expired temporary tunnel hostname.

Network failures automatically retry with delays of 1, 2, 4, 8, 16 and up to 30 seconds, at most 10 consecutive retries, resetting after successful setup. Setup has a 20-second deadline. An overall 60-second recovery deadline prevents endless reconnect/flapping; 30 seconds of stable readiness clears it. `지금 다시 연결` skips backoff without replacing the microphone/session. After terminal failure, `다시 연결하기` restarts a call. Proxy heartbeats run every 20 seconds with a 10-second browser pong deadline, and the relay also checks native Gemini pong. User stop, fatal authorization/configuration errors and the ten-minute safety limit still end the call. Proxy reconnection restores a Gemini-provided handle when available in the same relay process (two-minute cache); unavailable/rejected handles fall back to a fresh conversation. Audio lost during an outage is not replayed. See [INTEGRATION.md](INTEGRATION.md) for options, token security and scaling limitations.

Start the temporary tunnel in one terminal:

```sh
.tools/cloudflared tunnel --url http://127.0.0.1:8080 --no-autoupdate
```

Then start the server in another terminal with the exact HTTPS URL printed by the tunnel:

```sh
PUBLIC_ORIGIN=https://YOUR-TUNNEL.trycloudflare.com node server.js
```

Public mode no longer uses Basic Auth or password cookies. No login is required. `LIVE_ACCESS_PASSWORD` and any existing `.access-password` file are ignored by the server. Private files remain excluded from Git and are not served. WebSocket origins and hosts are still checked, but origin checks are not authentication: non-browser clients can forge headers.

Keep this Mac awake and keep both processes running. This is a temporary test URL, not permanent hosting: stopping or restarting the tunnel invalidates or changes it. Stop both processes with Ctrl+C to disable external access. Anyone who can reach the URL can consume your Gemini API quota. The eight-connection and 10-minute session caps are not per-user billing controls. The widget warns after 20 seconds of microphone silence and closes after 30 seconds, even when minimized or muted. Background sound can reset silence detection. Configure gateway rate limits and API budgets before broad sharing. Never publish your API key. Production application authentication can still be supplied through `authorizeRequest`.

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