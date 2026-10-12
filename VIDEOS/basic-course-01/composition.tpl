<!doctype html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>BASIC COURSE 01 · 자동사 뒤에는 무엇이 올까?</title>
  <script src="assets/vendor/gsap.min.js"></script>
  <style>
    @font-face { font-family: 'Noto Sans KR'; src: url('assets/fonts/NotoSansKR.ttf'); font-weight: 100 900; }
    @font-face { font-family: 'Manrope'; src: url('assets/fonts/Manrope.ttf'); font-weight: 200 800; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --cream: #F6F1E8; --ink: #252525; --accent: #FF6648; --red: #A33C35; }
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: var(--cream); }
    #root { position: relative; width: 100%; height: 100%; overflow: hidden; color: var(--ink); font-family: 'Noto Sans KR'; letter-spacing: 0; }
    .ground { position: absolute; inset: 0; background: var(--cream); }
    .header { position: absolute; top: 170px; left: 100px; width: 880px; display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid var(--ink); padding-bottom: 24px; }
    .brand { font: 800 38px 'Manrope'; }
    .course { font: 700 30px 'Manrope'; }
    .accent { color: var(--accent); background: var(--ink); padding: 0 8px; border-radius: 4px; }
    .clip { position: absolute; inset: 0; }
    .inner { position: absolute; inset: 0; }
    .eyebrow, .hero, .subhead, .diagram, .concept-copy, .ko, .wrong, .correct, .note, .summary-title, .summary-lines { opacity: 0; }
    .eyebrow { position: absolute; top: 335px; left: 100px; width: 880px; text-align: center; font-size: 34px; font-weight: 700; }
    .hero { position: absolute; top: 465px; left: 100px; width: 880px; text-align: center; font-size: 96px; font-weight: 850; line-height: 1.35; word-break: keep-all; }
    .subhead { position: absolute; top: 710px; left: 100px; width: 880px; text-align: center; font-size: 44px; font-weight: 600; line-height: 1.5; word-break: keep-all; }
    .diagram { position: absolute; top: 860px; left: 110px; width: 860px; height: 440px; }
    .chair-art { display: block; width: 100%; height: 100%; }
    .concept-copy { position: absolute; top: 1380px; left: 110px; width: 860px; font-size: 38px; line-height: 1.6; text-align: center; word-break: keep-all; }
    .structure { display: flex; align-items: center; justify-content: center; gap: 30px; height: 300px; }
    .token { text-align: center; font-size: 66px; font-family: 'Manrope'; font-weight: 800; padding: 16px; }
    .token small { display: block; padding-top: 24px; font: 500 32px 'Noto Sans KR'; }
    .diagram-note { text-align: center; font-size: 38px; }
    .comparison { display: flex; flex-direction: column; justify-content: center; gap: 65px; height: 440px; font: 800 60px/1.4 'Manrope'; text-align: center; }
    .comparison .incorrect { color: var(--red); }
    .ko { position: absolute; top: 545px; left: 110px; width: 860px; min-height: 210px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 52px; font-weight: 650; line-height: 1.5; word-break: keep-all; }
    .wrong { position: absolute; top: 810px; left: 110px; width: 860px; padding: 26px 36px; background: #FBE3E0; border-left: 5px solid var(--red); }
    .wrong-label { color: var(--red); font: 750 28px 'Manrope'; margin-bottom: 12px; }
    .wrong-text { color: var(--red); font: 600 44px/1.4 'Manrope'; }
    .correct { position: absolute; top: 1080px; left: 110px; width: 860px; }
    .correct-label { font: 800 30px 'Manrope'; margin-bottom: 22px; }
    .words { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; gap: 12px 14px; width: 860px; font: 800 64px/1.35 'Manrope'; }
    .word { display: inline-block; padding: 0 5px; transform-origin: center; }
    .word.key { color: var(--accent); background: var(--ink); border-radius: 4px; padding: 0 10px; }
    .note { position: absolute; top: 1460px; left: 110px; width: 860px; padding-top: 26px; border-top: 2px solid var(--ink); text-align: center; font-size: 36px; line-height: 1.6; word-break: keep-all; }
    .pattern { display: block; margin-top: 14px; font: 750 30px 'Manrope'; }
    .summary-title { position: absolute; top: 570px; left: 110px; width: 860px; font-size: 72px; font-weight: 800; text-align: center; }
    .summary-lines { position: absolute; top: 840px; left: 110px; width: 860px; text-align: center; font-size: 64px; font-weight: 750; line-height: 1.7; }
    .summary-lines p + p { margin-top: 75px; }
    .footer { position: absolute; top: 1700px; left: 100px; width: 880px; display: flex; justify-content: space-between; font-size: 28px; }
    .progress-rail { position: absolute; left: 100px; top: 1780px; width: 880px; height: 5px; background: #D2CCC3; }
    .progress { width: 100%; height: 100%; background: var(--ink); transform-origin: left; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="basic-course-01" data-width="1080" data-height="1920" data-duration="130" data-fps="30">
    <div class="ground" data-layout-ignore></div>
    <div class="header"><span class="brand">daynize<span class="accent">.</span></span><span class="course">BASIC COURSE / 01</span></div>
    {{SCENES}}
    <div class="footer"><span>동사 중심으로 이해하는 영어</span><span>1·2형식</span></div>
    <div class="progress-rail" data-layout-ignore><div class="progress"></div></div>
    <audio id="narration" src="assets/audio/narration.wav" data-start="0" data-duration="130" data-track-index="1"></audio>
  </div>
  <script>
    const scenes = {{TIMELINE}};
    const timeline = gsap.timeline({ paused: true });
    for (const scene of scenes) {
      const base = '#' + scene.id;
      const enter = (selector, at, scale = 0.92) => timeline.fromTo(selector, { opacity: 0, scale }, { opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(1.1)', immediateRender: false }, at);
      if (scene.kind === 'example') {
        enter(base + ' .eyebrow', scene.start);
        enter(base + ' .ko', scene.clips[0].start);
        enter(base + ' .wrong', scene.clips[0].end + 0.04, 0.97);
        enter(base + ' .correct', scene.clips[1].start);
        enter(base + ' .note', scene.clips[1].end, 0.98);
        for (const [index, word] of scene.words.entries()) {
          if (!word.emphasis) continue;
          const selector = base + ' .word-' + index;
          timeline.fromTo(selector, { scale: 1 }, { scale: 1.10, duration: 0.10, ease: 'power2.out', immediateRender: false }, word.start);
          timeline.to(selector, { scale: 1, duration: 0.14, ease: 'power2.inOut' }, word.start + 0.10);
        }
      } else if (scene.kind === 'intro') {
        enter(base + ' .eyebrow', scene.start);
        enter(base + ' .hero', scene.clips[0].start);
        enter(base + ' .subhead', scene.start + 1.2);
        enter(base + ' .diagram', scene.start + 2.3, 0.96);
        enter(base + ' .concept-copy', scene.clips[0].start, 0.98);
        if (scene.graphic === 'chair') {
          timeline.fromTo(base + ' .person', { y: -65 }, { y: 0, duration: 0.8, ease: 'power2.inOut', immediateRender: false }, scene.start + 3);
          timeline.fromTo(base + ' .seat-link', { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, scene.start + 4);
        }
      } else {
        enter(base + ' .eyebrow', scene.start);
        enter(base + ' .summary-title', scene.clips[0].start);
        enter(base + ' .summary-lines', scene.clips[0].start + 0.4);
      }
      timeline.to(base + ' .inner', { opacity: 0, duration: 0.15 }, scene.start + scene.duration - 0.15);
    }
    timeline.fromTo('.progress', { scaleX: 0 }, { scaleX: 1, duration: 130, ease: 'none' }, 0);
    window.__timelines = window.__timelines || {};
    window.__timelines['basic-course-01'] = timeline;
  </script>
</body>
</html>