// Replaces ONLY the `basic-course` category of courses.json with the 12 new lessons built in
// "NEW BASIC COURSE MASTER", and publishes their mp4/thumbnail files into the new folders:
//   VIDEOS/basic-course-12/renders/basic-NN.mp4   IMAGE/basic-course-12/basic-NN.jpg
// Every other category in courses.json is written back unchanged; the category card image (`thumbnail`) is kept as is. The previous 21-lesson files are left in place.
//
// Usage (repo root):  node scripts/register-basic-course-12.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = path.join(root, 'NEW BASIC COURSE MASTER');
const videoDir = path.join(root, 'VIDEOS/basic-course-12/renders');
const imageDir = path.join(root, 'IMAGE/basic-course-12');

// folder = "NEW BASIC COURSE <folder>" project that produced the lesson
const LESSONS = [
    { folder: 20, title: '자동사', desc: '목적어 없이 문장이 완성되는 자동사와, 장소·시간 정보를 잇는 전치사를 익힌다.', topic: '자동사', phrase: 'He arrived at the airport.', explanation: '자동사는 목적어 없이 문장이 끝나요. 장소나 시간 정보는 전치사로 덧붙이세요.' },
    { folder: 21, title: '불가산명사', desc: '셀 수 없는 명사는 a/an이나 복수형 없이 쓰고, 단위 표현으로 양을 나타낸다.', topic: '불가산명사', phrase: 'A glass of water is on the table.', explanation: '물·공기처럼 셀 수 없는 명사는 a glass of 같은 단위를 붙여서 세요.' },
    { folder: 22, title: '분사', desc: '명사를 꾸미는 현재분사(-ing)와 과거분사(-ed)의 능동·수동 차이를 구분한다.', topic: '현재분사와 과거분사', phrase: 'The rising sun illuminates the city.', explanation: '-ing는 스스로 하는 쪽, -ed는 당했거나 끝난 쪽의 명사를 꾸며요.' },
    { folder: 23, title: '동명사와 to부정사', desc: '동사에 따라 목적어로 오는 동명사(-ing)와 to부정사를 구분한다.', topic: '동명사와 to부정사', phrase: 'He enjoyed listening to his favorite music.', explanation: 'enjoy·finish 뒤에는 -ing, 목적이나 계획에는 to부정사를 써요. stop 뒤에서는 뜻이 달라져요.' },
    { folder: 24, title: '전치사 at, on, in', desc: '시간과 장소를 나타내는 at(한 점), on(날짜·표면), in(기간·공간)을 구분한다.', topic: '시간·장소 전치사', phrase: 'He agreed to meet his friend at noon.', explanation: 'at은 한 시점, on은 날짜와 표면, in은 넓은 기간과 공간에 써요.' },
    { folder: 25, title: '수동태', desc: '행위자보다 대상을 앞세우는 수동태(be + 과거분사)와 by를 쓰는 경우를 익힌다.', topic: '수동태', phrase: 'The bookstore was built by a famous architect.', explanation: '대상이 주어가 되면 be + 과거분사로 쓰고, 행위자를 밝힐 때 by를 붙여요.' },
    { folder: 28, title: '부사', desc: '동사·형용사·문장을 꾸미는 부사와, fast·hard·late, friendly·lovely 같은 형태의 함정을 구분한다.', topic: '부사', phrase: 'She walked fast to arrive early for her meeting.', explanation: 'fast·hard·late는 -ly 없이도 부사이고, friendly·lovely는 -ly가 붙어도 형용사예요.' },
    { folder: 26, title: '감정형용사', desc: '감정을 일으키는 -ing와 감정을 느끼는 -ed를 구분한다.', topic: '감정형용사', phrase: 'He felt extremely excited about the news.', explanation: '감정을 주는 원인에는 -ing, 그 감정을 느끼는 사람에는 -ed를 써요.' },
    { folder: 27, title: '관계대명사', desc: '접속사와 대명사 역할을 함께 하는 who·which·that·what을 구분한다.', topic: '관계대명사', phrase: 'He met a woman who was smiling brightly.', explanation: '사람 뒤에는 who, 사물 뒤에는 which, 둘 다 되는 that, 명사 없이 ‘~하는 것’은 what을 써요.' },
    { folder: 31, title: 'in, on, at which', desc: '전치사가 which 바로 앞으로 당겨져 오는 원리를 in·on·at which로 익힌다.', topic: '전치사 + 관계대명사 (in, on, at)', phrase: 'There was a small table on which an old box was placed.', explanation: '문장 끝에 남은 전치사가 which 앞으로 와요. 전치사 뜻 + “그런데 그것은!”으로 해석하세요.' },
    { folder: 29, title: 'of, for, from, by, with which', desc: '전치사가 which 앞으로 당겨져 오는 원리를 of·for·from·by·with which로 익힌다.', topic: '전치사 + 관계대명사 (of, for, from, by, with)', phrase: 'It was a key by which their hearts were connected.', explanation: '소유·목적·출처·수단·도구처럼 전치사의 원래 뜻에 “그런데 그것은!”을 붙여 해석하세요.' },
    { folder: 30, title: 'another, other, the other', desc: '남은 개수가 막연한지 정해졌는지에 따라 another, other, the other를 구분한다.', topic: 'another · other · the other', phrase: 'He packed the other apples into his bag.', explanation: '남은 게 많아 막연하면 another·other, 눈에 딱 정해진 나머지는 the other(s)를 써요.' },
];

const strip = (s) => (s ?? '').replace(/\{[a-z]\|([^}]*)\}/g, '$1');
const format = (seconds) => `${Math.floor(seconds / 60)}분 ${Math.round(seconds % 60)}초`;
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

mkdirSync(videoDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

const lessons = LESSONS.map((lesson, index) => {
    const number = String(index + 1).padStart(2, '0');
    const source = path.join(master, 'dist', `basic-${number}.mp4`);
    if (!existsSync(source)) throw new Error(`Missing render: ${source}`);
    const seconds = Math.round(Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', source])));
    copyFileSync(source, path.join(videoDir, `basic-${number}.mp4`));
    // the cover title card is fully visible at ~2 s
    run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', source, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '3', path.join(imageDir, `basic-${number}.jpg`)]);
    const cues = JSON.parse(readFileSync(path.join(master, `NEW BASIC COURSE ${lesson.folder}`, 'scripts/cues.json'), 'utf8'));
    return {
        id: `basic-${number}`,
        episode: String(index + 1),
        title: `${index + 1}강 · ${lesson.title}`,
        desc: lesson.desc,
        duration: format(seconds),
        durationSeconds: seconds,
        videoUrl: `VIDEOS/basic-course-12/renders/basic-${number}.mp4`,
        thumbnail: `IMAGE/basic-course-12/basic-${number}.jpg`,
        keyPhrase: lesson.phrase,
        explanation: lesson.explanation,
        curriculumTopic: lesson.topic,
        koreanVoice: 'ElevenLabs 한국어 성우',
        englishVoice: 'ElevenLabs 영어 성우',
        script: cues.filter((cue) => cue.scene === 'story').map((cue) => ({ ko: strip(cue.kr), en: strip(cue.en) })),
    };
});

const file = path.join(root, 'courses.json');
const categories = JSON.parse(readFileSync(file, 'utf8'));
const position = categories.findIndex((item) => item.categoryId === 'basic-course');
if (position < 0) throw new Error('basic-course category not found');
const previous = categories[position];
categories[position] = {
    ...previous,
    categoryDesc: '영어의 구조를 이해하는 12강. 한 강의, 한 원리, 도시동화 예문으로 익힙니다.',
    curriculumVersion: 3,
    lessons,
};
writeFileSync(file, JSON.stringify(categories, null, 4), 'utf8'); // the file has no trailing newline; keep it byte-compatible
console.log(`basic-course: ${previous.lessons.length} lessons -> ${lessons.length}; other categories untouched (${categories.length - 1}).`);
