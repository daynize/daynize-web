<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>BASIC COURSE {{EPISODE}} / {{TITLE}}</title>
  <script src="assets/vendor/gsap.min.js"></script>
  <style>
    @font-face { font-family: 'Noto Sans KR'; src: url('assets/fonts/NotoSansKR.ttf'); font-weight: 100 900; }
    @font-face { font-family: 'Manrope'; src: url('assets/fonts/Manrope.ttf'); font-weight: 200 800; }
    :root { --cream: #F6F1E8; --ink: #252525; --accent: #FF6648; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--cream); }
    #root { position: relative; width: 100%; height: 100%; overflow: hidden; color: var(--ink); font-family: 'Noto Sans KR'; letter-spacing: 0; }
    .ground { position: absolute; inset: 0; background: var(--cream); }
    .header { position: absolute; top: 180px; left: 100px; width: 880px; height: 115px; border-bottom: 3px solid var(--ink); }
    .category { font: 800 28px 'Manrope'; }
    .lesson-title { margin-top: 10px; font-size: 32px; font-weight: 750; line-height: 1.4; word-break: keep-all; }
    .clip, .inner { position: absolute; inset: 0; }
    .eyebrow, .hero, .diagram, .concept-copy, .ko, .wrong, .correct, .note, .summary-lines { opacity: 0; }
    .eyebrow { position: absolute; top: 340px; left: 100px; width: 880px; height: 60px; text-align: center; font-size: 30px; font-weight: 700; }
    .hero { position: absolute; top: 480px; left: 100px; width: 880px; height: 420px; display: flex; flex-direction: column; justify-content: center; gap: 14px; text-align: center; font-weight: 800; line-height: 1.3; word-break: keep-all; overflow-wrap: break-word; }
    .diagram { position: absolute; top: 970px; left: 100px; width: 880px; height: 300px; display: grid; grid-template-columns: 300px 1fr; gap: 30px; align-items: center; }
    .diagram svg { width: 300px; height: 230px; }
    .diagram-nodes { display: flex; flex-direction: column; gap: 12px; border-left: 4px solid var(--ink); padding-left: 22px; }
    .diagram-node { font-size: 30px; font-weight: 650; line-height: 1.35; word-break: keep-all; overflow-wrap: break-word; }
    .concept-copy { position: absolute; top: 1320px; left: 100px; width: 880px; height: 300px; display: flex; align-items: center; justify-content: center; font-size: 36px; line-height: 1.5; text-align: center; word-break: keep-all; }
    .ko { position: absolute; top: 490px; left: 100px; width: 880px; height: 210px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 46px; font-weight: 700; line-height: 1.4; word-break: keep-all; }
    .wrong { position: absolute; top: 780px; left: 100px; width: 880px; height: 240px; padding: 20px 30px; background: #FBE3E0; border-left: 5px solid #A33C35; color: #A33C35; font: 650 42px/1.35 'Manrope'; overflow-wrap: break-word; }
    .label { font: 700 28px/1.3 'Noto Sans KR'; margin-bottom: 18px; }
    .correct { position: absolute; top: 1070px; left: 100px; width: 880px; height: 340px; text-align: center; }
    .words { width: 880px; height: 285px; padding: 12px 16px; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 16px 14px; font: 800 60px/1.35 'Manrope'; }
    .word { display: block; padding: 0 5px; transform-origin: center; }
    .word.key { color: var(--accent); background: var(--ink); border-radius: 4px; padding: 0 10px; }
    .note { position: absolute; top: 1480px; left: 100px; width: 880px; height: 210px; padding-top: 20px; border-top: 2px solid var(--ink); text-align: center; font-size: 30px; line-height: 1.5; word-break: keep-all; }
    .summary-lines { position: absolute; top: 480px; left: 100px; width: 880px; height: 800px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 64px; font-weight: 800; line-height: 1.5; word-break: keep-all; }
    .footer { position: absolute; top: 1740px; left: 100px; width: 880px; font-size: 26px; }
    .progress-rail { position: absolute; left: 100px; top: 1800px; width: 880px; height: 6px; background: #D2CCC3; }
    .progress { width: 100%; height: 100%; background: var(--ink); transform-origin: left; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="{{ID}}" data-width="1080" data-height="1920" data-duration="{{DURATION}}" data-fps="30">
    <div class="ground" data-layout-ignore></div>
    <header class="header"><div class="category">daynize / BASIC COURSE {{EPISODE}}</div><div class="lesson-title">{{TITLE}}</div></header>
    {{SCENES}}
    <div class="footer">동사 중심으로 이해하는 영어</div>
    <div class="progress-rail" data-layout-ignore><div class="progress"></div></div>
    <audio id="narration" src="assets/audio/narration.wav" data-start="0" data-duration="{{DURATION}}" data-track-index="1"></audio>
  </div>
  <script>
    const scenes = {{TIMELINE}};
    const timeline = gsap.timeline({ paused: true });
    const enter = (selector, at) => timeline.fromTo(selector, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out', immediateRender: false }, at);
    for (const scene of scenes) {
      const base = '#' + scene.id;
      enter(base + ' .eyebrow', scene.start);
      if (scene.kind === 'example') {
        enter(base + ' .ko', scene.koAt);
        enter(base + ' .wrong', scene.wrongAt);
        enter(base + ' .correct', scene.enAt);
        enter(base + ' .note', scene.noteAt);
        for (const pulse of scene.pulses) {
          const selector = base + ' .word-' + pulse.index;
          timeline.fromTo(selector, { scale: 1 }, { scale: 1.10, duration: 0.1, ease: 'power2.out', immediateRender: false }, pulse.at);
          timeline.to(selector, { scale: 1, duration: 0.14, ease: 'power2.inOut' }, pulse.at + 0.1);
        }
      } else if (scene.kind === 'summary') {
        enter(base + ' .summary-lines', scene.koAt);
        enter(base + ' .concept-copy', scene.koAt);
      } else {
        enter(base + ' .hero', scene.koAt);
        enter(base + ' .concept-copy', scene.koAt);
        enter(base + ' .diagram', scene.koAt + 0.25);
        timeline.fromTo(base + ' .diagram svg', { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'power2.out', immediateRender: false }, scene.koAt + 0.25);
      }
      if (scene.kind !== 'summary') timeline.to(base + ' .inner', { opacity: 0, duration: 0.15 }, scene.end - 0.15);
    }
    timeline.fromTo('.progress', { scaleX: 0 }, { scaleX: 1, duration: {{DURATION}}, ease: 'none', immediateRender: false }, 0);
    window.__timelines = window.__timelines || {};
    window.__timelines['{{ID}}'] = timeline;
  </script>
</body>
</html>