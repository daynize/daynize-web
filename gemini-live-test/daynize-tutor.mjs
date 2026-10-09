import { mountVoiceTutor } from './tutor-widget.mjs';
import { resolveWebSocketUrl } from './live-service.mjs';

const loader = document.querySelector('script[data-daynize-tutor]');
let config = globalThis.DAYNIZE_CONFIG;
if (!loader?.dataset.endpoint && !config?.wsUrl) {
    try {
        const response = await fetch(new URL('runtime-config.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        if (response.ok) config = await response.json();
    } catch { }
}
const endpoint = resolveWebSocketUrl({ endpoint: loader?.dataset.endpoint, config });
const designPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === 'design';
if (!document.querySelector('daynize-voice-tutor')) {
    const widget = mountVoiceTutor({ endpoint, designPreview });
    if (designPreview) widget.open();
}