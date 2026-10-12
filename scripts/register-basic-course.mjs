import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { course, voiceFor } from '../VIDEOS/basic-course-21/course.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const file = path.join(root, 'courses.json');
const categories = JSON.parse(await readFile(file, 'utf8'));
const production = JSON.parse(await readFile(path.join(root, 'VIDEOS/basic-course-21/production-status.json'), 'utf8'));
assert.equal(production.renderStatus, '21-rendered-and-probed');
assert.equal(production.videos.length, 21);
const lessons = [];
for (const lesson of course.lessons) {
    const number = String(lesson.episode).padStart(2, '0');
    const videoUrl = `VIDEOS/basic-course-21/renders/basic-${number}.mp4`;
    const bytes = (await stat(path.join(root, videoUrl))).size;
    const receipt = production.videos.find(video => video.episode === lesson.episode);
    assert.equal(bytes, receipt.bytes);
    lessons.push({
        id: `basic-${number}`, episode: lesson.episode,
        title: `${lesson.episode}강 · ${lesson.title}`, desc: lesson.objective,
        duration: '2분 10초', durationSeconds: 130, videoUrl,
        thumbnail: `IMAGE/basic-course/basic-${number}.jpg`,
        keyPhrase: lesson.examples[0].en, explanation: lesson.summary,
        curriculumTopic: lesson.category, koreanVoice: voiceFor(lesson.episode), englishVoice: 'Samantha',
        script: lesson.examples.map(example => ({ ko: example.ko, en: example.en, incorrect: example.wrong, explanation: example.note })),
    });
}
const category = {
    categoryId: 'basic-course', categoryName: 'BASIC COURSE',
    categoryDesc: '동사 중심으로 영어의 구조를 이해하는 21강. 한 강의, 한 원리, 열 문장으로 익힙니다.',
    thumbnail: 'IMAGE/basic-course/basic-01.jpg', curriculumVersion: 2, lessons,
};
const previous = categories.findIndex(item => ['basic-course', 'basic'].includes(item.categoryId));
const updated = categories.filter(item => !['basic-course', 'basic'].includes(item.categoryId));
updated.splice(previous < 0 ? 0 : previous, 0, category);
await writeFile(file, `${JSON.stringify(updated, null, 4)}\n`);
console.log('PASS: registered 21 verified BASIC COURSE lessons; unrelated categories preserved');