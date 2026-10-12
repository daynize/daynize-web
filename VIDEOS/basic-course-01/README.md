# BASIC COURSE 01

1·2형식 동사와 전치사의 관계. 1080×1920 / 30fps / 130초.

## 제작 소스

- `lesson.mjs`: 승인된 대본, 예문 10개, 지정 성우.
- `composition.tpl`: 크림 배경, 중앙 자막, 오답/정답 대조, 확대 모션.
- `timeline.json`: 실제 음성 길이와 영어 단어별 자동 정렬 시각.
- `SCRIPT.md`: 실제 발화 시각을 반영한 전체 대본.
- `index.html`: 생성된 HyperFrames composition. 직접 수정하지 말고 템플릿을 수정한다.

## 명령

```sh
npm run audio
npm run align
npm run build
npm test
npm run check
npx --yes hyperframes@0.8.149 preview --background --port 3027
```

macOS `say`, `ffmpeg`, `ffprobe`, `whisper-cli`가 필요하다.
음성은 `Jian (Premium)`과 `Samantha`를 사용하며 다른 음성으로 대체하지 않는다.
Whisper 모델 기본 경로는 `~/.cache/hyperframes/whisper/models/ggml-base.en.bin`이다.
다른 모델 파일 경로는 `WHISPER_MODEL`로 지정할 수 있다.
대본이나 말속도를 바꿀 때 해당 문장의 캐시 WAV와 aligned JSON을 먼저 제거하고 다시 생성한다.

## 검수와 출력

자동 정렬은 실제 음성에서 얻은 토큰 시각이지만 인간 청취 검수를 대신하지 않는다.
한글 문장 자막은 한글 발화 시작에, 영어 정답은 영어 발화 시작에 공개한다.
잘못된 영어 문장은 화면으로만 표시한다. 배경음악은 넣지 않았다.
주황색 `#FF6648`은 작은 화면에서도 읽히도록 차콜 강조면 위에 배치한다.
현재 단일 composition의 15장면에 대한 편집 구조 경고는 렌더링 오류가 아니다.

최종 미리보기 승인 후:

```sh
npm run render -- --quality delivery --fps 30 --output renders/basic-course-01.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json renders/basic-course-01.mp4
```

웹사이트 게시와 나머지 19강 제작은 아직 수행하지 않는다.