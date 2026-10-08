import { mountVoiceTutor } from './tutor-widget.mjs';

const loader = document.querySelector('script[data-daynize-tutor]');
const sameOriginTest = location.hostname.endsWith('.trycloudflare.com') || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const endpoint = loader?.dataset.endpoint || (sameOriginTest
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/gemini-live`
    : 'wss://api.daynize.co.kr/ws/gemini-live');
const launchUrl = sameOriginTest ? undefined : loader?.dataset.testUrl;
if (!document.querySelector('daynize-voice-tutor')) mountVoiceTutor({ endpoint, launchUrl });