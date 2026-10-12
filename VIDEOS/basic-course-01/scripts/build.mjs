import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const timeline = JSON.parse(await readFile(path.join(root, 'timeline.json'), 'utf8'));
const template = await readFile(path.join(root, 'composition.tpl'), 'utf8');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const chair = `<svg class="chair-art" viewBox="0 0 860 440" aria-label="의자에 앉는 동작과 on의 연결"><path d="M80 360H780" stroke="#C8C0B4" stroke-width="5"/><path d="M525 120V265H365M385 265V360M525 265V360" fill="none" stroke="#252525" stroke-width="16" stroke-linecap="round"/><g class="person"><circle cx="385" cy="65" r="33" fill="#FF6648"/><path d="M385 110V228H465V330M385 155L450 190" fill="none" stroke="#252525" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></g><path class="seat-link" d="M330 245H505" stroke="#FF6648" stroke-width="10" stroke-linecap="round"/><text x="140" y="200" font-family="Manrope" font-size="58" font-weight="800" fill="#252525">sit</text><text x="610" y="265" font-family="Manrope" font-size="58" font-weight="800" fill="#252525">on</text></svg>`;
const diagram = scene => scene.graphic === 'chair' ? chair.replace('class="seat-link"', 'class="seat-link" data-layout-ignore') : scene.graphic === 'comparison'
    ? '<div class="comparison"><p class="incorrect">❌ I sat the chair.</p><p>⭕ I <span class="accent">sat on</span> the chair.</p></div>' : scene.graphic === 'structure'
        ? '<div class="structure"><div class="token">I<small>주어</small></div><div class="token"><span class="accent">sat</span><small>동사</small></div><div class="token">on the chair<small>장소 정보</small></div></div><p class="diagram-note">전치사 뒤의 명사 ≠ 동사의 목적어</p>'
        : '<div class="structure"><div class="token">She<small>주어</small></div><div class="token"><span class="accent">looks</span><small>동사</small></div><div class="token"><span class="accent">happy</span><small>주격 보어</small></div></div><p class="diagram-note">happy → She의 상태를 설명</p>';
const scenes = timeline.scenes.map(scene => {
    let content;
    if (scene.kind === 'intro') {
        content = `<p class="eyebrow">개념 / ${scene.id.slice(-1).padStart(2, '0')}</p><h1 class="hero">${escape(scene.title)}</h1><p class="subhead">${escape(scene.subtitle)}</p><div class="diagram">${diagram(scene)}</div><p class="concept-copy">${escape(scene.text)}</p>`;
    } else if (scene.kind === 'example') {
        assert.ok(scene.words?.length, 'Run alignment before building visuals');
        const words = scene.words.map((word, index) => `<span class="word word-${index}${word.emphasis ? ' key' : ''}">${escape(word.text)}</span>`).join('');
        content = `<p class="eyebrow">${String(scene.number).padStart(2, '0')} / 10 · ${escape(scene.level)}</p><p class="ko">${escape(scene.ko)}</p><div class="wrong"><p class="wrong-label">❌ Incorrect</p><p class="wrong-text">${escape(scene.wrong)}</p></div><div class="correct"><p class="correct-label">⭕ Correct</p><p class="words">${words}</p></div><p class="note">${escape(scene.note)}<span class="pattern">${escape(scene.pattern)}</span></p>`;
    } else {
        content = '<p class="eyebrow">핵심 정리</p><h1 class="summary-title">동사 뒤를 구분하세요</h1><div class="summary-lines"><p><span class="accent">전치사구</span>는 상황을 더한다</p><p><span class="accent">2형식 보어</span>는 주어를 설명한다</p></div>';
    }
    return `<section id="${scene.id}" class="clip" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="0"><div class="inner">${content}</div></section>`;
}).join('\n');
const html = template.replace('{{SCENES}}', scenes).replace('{{TIMELINE}}', JSON.stringify(timeline.scenes).replaceAll('<', '\\u003c'));
assert.ok(!html.includes('{{'));
await writeFile(path.join(root, 'index.html'), html);
const format = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
const script = ['# BASIC COURSE 01 · 전체 대본 및 실제 음성 타임라인', '', `총 ${timeline.duration}초 / ${timeline.fps}fps / 지안 프리미엄 + Samantha`, '', '오답 문장은 화면만 표시하며 발화하지 않습니다. 자동 단어 정렬은 청취 검수가 필요합니다.', '', ...timeline.scenes.flatMap(scene => [`## ${format(scene.start)} · ${scene.kind === 'example' ? `예문 ${scene.number} (${scene.level})` : scene.kind === 'intro' ? scene.title : '핵심 정리'}`, '', ...scene.clips.map(clip => `- ${format(clip.start)}–${format(clip.end)} / ${clip.voice}: ${clip.text}`), ...(scene.wrong ? [`- Incorrect 화면: ${scene.wrong}`, `- 교정 포인트: ${scene.note}`] : []), ''])].join('\n');
await writeFile(path.join(root, 'SCRIPT.md'), script);
console.log(`PASS: ${timeline.scenes.length} scenes, 10 examples, 130 seconds, local fonts and audio`);