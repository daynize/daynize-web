import { mountVoiceTutor } from './tutor-widget.mjs';

const loader = document.querySelector('script[data-daynize-tutor]');
const sameOriginTest = location.hostname.endsWith('.trycloudflare.com') || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const endpoint = loader?.dataset.endpoint || (sameOriginTest
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/gemini-live`
    : 'wss://api.daynize.co.kr/ws/gemini-live');
const designPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === 'design';
if (!document.querySelector('daynize-voice-tutor')) {
    const widget = mountVoiceTutor({ endpoint, designPreview });
    if (designPreview) widget.open();
}