# BASIC COURSE · 개편 21강

한 강의, 한 원리, 열 문장. 동사 구조를 중심으로 한국식 번역 습관과 어법 오류를 교정한다.

- 제작 목차: [INDEX.md](INDEX.md)
- 완성 영상 목차: [VIDEO.md](VIDEO.md)
- 실제 오디오·타임코드 목차: [AUDIO.md](AUDIO.md)
- 최신 제작 상태: [production-status.json](production-status.json)
- 강의별 전체 대본·타임라인·성우·모션 지시: `lessons/01.md`부터 `lessons/21.md`
- 원본 콘텐츠: `content/lessons-01-02.mjs`, `content/lessons-03-12.mjs`, `content/lessons-13-21.mjs`
- 구조화 제작 계획: `plans/01.json`부터 `plans/21.json`
- 목록·썸네일 문구·제작 상태: `catalog.json`

## 생성과 검증

저장소 루트에서:

```sh
node VIDEOS/basic-course-21/scripts/build-docs.mjs
node VIDEOS/basic-course-21/scripts/audio.mjs
ALIGN_MODEL=small.en node VIDEOS/basic-course-21/scripts/align-audio.mjs
node VIDEOS/basic-course-21/scripts/verify-audio.mjs
node --test VIDEOS/basic-course-21/test/*.test.mjs
```

생성된 문서·JSON을 직접 수정하지 않고 원본 콘텐츠와 생성기를 수정한다.
강 번호·예문 수·강조 구간·성우 교대·발화 순서·목표 시간 연속성·생성 문서 일치를 검사한다.

## 타임코드와 제작 상태

21강 음성 525개와 130초 믹스 트랙 21개를 생성·디코딩했고 개편 MP4 21개를 출력·검증했다.
모든 영상은 1080×1920, 30fps, 3,900프레임이며 강의별 실제 발화 기준 35개 시점의 브라우저 검사와 출력 오디오 검증을 통과했다.
완성 영상과 장면 모음은 VIDEO.md에 있다. 전체 청취 검수와 실제 웹사이트 게시가 완료된 상태는 아니다.
영어 예문 210개, 1,699개 단어의 자동 정렬 시각을 기록했다. 실제 음성 기준 문장 타임코드는 timelines와 audio-timelines에 있다.
plans와 lessons는 대본 단계의 목표 계획 스냅샷이며 실제 오디오 상태는 AUDIO.md와 production-status.json을 기준으로 확인한다.
자동 단어 정렬은 근사값이며 청취 검수가 남아 있다. 6강 so 한 토큰은 시작 시점만 기록하고 길이는 추정하지 않았다.
원고·성우·속도를 변경하면 새 캐시 파일을 사용한다. 음성 재생성 후에는 정렬도 다시 실행한다.
한글 먼저, 0.3초 이상의 간격 후 영어 정답. 오답은 시각 표시만 한다.
Jian (Premium)과 Minsu (Enhanced)를 홀수·짝수 강으로 교대하며 영어는 Samantha다.

## 교육·마케팅 편집 기준

목록 제목은 해당 문법 범위를 식별하고, hook은 그 강의에서 바로 고칠 수 있는 실수를 질문으로 제시한다.
성적·유창성·숙달 시간을 보장하거나 학습자를 비하하는 문구를 쓰지 않는다.
기본 3개, 중급 4개, 고급 3개로 난도를 높인다. 10개 대조 예문을 모두 핵심 개념에 연결한다.
문법적 비문과 제시된 의미에 맞지 않는 문장은 구분해 설명한다.
한국어 을/를로 영어 목적어를 판별하거나 모든 to를 부정사로 보는 식의 일반화를 하지 않는다.
3·4·5형식, 분사, 수동태 등은 동사·문맥·방언별 예외를 정확성 메모에 기록한다.
수업 영상에는 별도 광고 아웃트로나 새 예문을 더해 분량을 늘리지 않는다.

## 기존 영상 보존

기존 `../basic-course-01`은 개편 전 단일 강의다. 새 1강이나 새 2강의 완성 영상으로 대체·분류하지 않았다.
사용자 요청에 따라 중간 평가·강의별 승인 요청 없이 진행하지만, 웹사이트 게시나 외부 계정 변경은 하지 않는다.