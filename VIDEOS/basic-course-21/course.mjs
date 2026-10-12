import { lessons as opening } from './content/lessons-01-02.mjs';
import { lessons as middle } from './content/lessons-03-12.mjs';
import { lessons as closing } from './content/lessons-13-21.mjs';

export const course = {
    id: 'basic-course-21-v2',
    name: 'BASIC COURSE',
    revision: 2,
    positioning: '번역 습관을 바꾸는 동사 중심 영어 · 한 강의, 한 원리, 열 문장',
    duration: { minimum: 100, target: 130, maximum: 135 },
    format: { width: 1080, height: 1920, fps: 30 },
    voices: { odd: 'Jian (Premium)', even: 'Minsu (Enhanced)', english: 'Samantha' },
    palette: { background: '#F6F1E8', foreground: '#252525', accent: '#FF6648', incorrectSurface: '#FBE3E0', incorrectText: '#A33C35' },
    timingStatus: 'planned-not-synthesized',
    lessons: [...opening, ...middle, ...closing].sort((first, second) => first.episode - second.episode),
};

export const exampleWindows = [
    [40, 47], [47, 54], [54, 61], [61, 69], [69, 77],
    [77, 85], [85, 94], [94, 104], [104, 114], [114, 125],
];

export const voiceFor = episode => episode % 2 ? course.voices.odd : course.voices.even;
export const levelFor = number => number <= 3 ? '기본' : number <= 7 ? '중급' : '고급';

export function planLesson(lesson) {
    const koVoice = voiceFor(lesson.episode);
    const scenes = lesson.concept.map((concept, index) => ({
        id: `concept-${index + 1}`, kind: index === 3 ? 'contrast' : 'concept',
        start: index * 10, end: (index + 1) * 10, ...concept,
        narration: [{ id: `concept-${index + 1}-ko`, lang: 'ko', voice: koVoice, text: concept.text, actualStart: null, actualEnd: null }],
    }));
    for (const [index, example] of lesson.examples.entries()) {
        const [start, end] = exampleWindows[index];
        scenes.push({
            id: `example-${index + 1}`, kind: 'example', number: index + 1,
            level: levelFor(index + 1), start, end, ...example,
            contrastType: /문법적으로 가능|도 가능|의미.*다르|가능하지만/.test(example.note) ? 'intended-meaning-or-context' : 'form-or-usage',
            narration: [
                { id: `example-${index + 1}-ko`, lang: 'ko', voice: koVoice, text: example.ko, actualStart: null, actualEnd: null },
                { id: `example-${index + 1}-en`, lang: 'en', voice: course.voices.english, text: example.en, actualStart: null, actualEnd: null },
            ],
            sync: { order: ['ko', 'en'], minimumGapSeconds: 0.3, wrongSpoken: false, englishReveal: 'english-audio-start', focusTimes: example.focus.map(text => ({ text, actualStart: null })) },
        });
    }
    scenes.push({ id: 'summary', kind: 'summary', start: 125, end: 130, text: lesson.summary, narration: [{ id: 'summary-ko', lang: 'ko', voice: koVoice, text: lesson.summary, actualStart: null, actualEnd: null }] });
    return { id: `basic-${String(lesson.episode).padStart(2, '0')}`, episode: lesson.episode, title: lesson.title, durationTarget: 130, timingStatus: course.timingStatus, voices: { ko: koVoice, en: course.voices.english }, scenes };
}