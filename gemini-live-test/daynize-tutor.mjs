import { mountVoiceTutor } from './tutor-widget.mjs';

const loader = document.querySelector('script[data-daynize-tutor]');
const sameOriginTest = location.hostname.endsWith('.trycloudflare.com') || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const testUrl = !sameOriginTest && loader?.dataset.testUrl ? new URL(loader.dataset.testUrl) : undefined;
if (testUrl && (testUrl.protocol !== 'https:' || testUrl.username || testUrl.password)) throw new Error('Invalid HTTPS tutor endpoint');
const endpoint = loader?.dataset.endpoint || (testUrl ? `wss://${testUrl.host}/ws/gemini-live` : sameOriginTest
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/gemini-live`
    : 'wss://api.daynize.co.kr/ws/gemini-live');
if (!document.querySelector('daynize-voice-tutor')) mountVoiceTutor({ endpoint });