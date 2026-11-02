# 영상 제작 워크플로 (고정 조건)

이 문서의 조건은 20여 개 후속 영상에서도 바꾸지 않는다. 기준: "01강 자동사와 타동사" 최종본.

## 고정 조건
| 항목 | 값 |
| --- | --- |
| 한국어 성우 [KR] | `0emXFRrt8HxjqJpgeQtr` |
| 영어 성우 [EN] | `r1KmysJdVYZjJCm4mL3b` |
| 다른 성우 | 사용 금지 (Yuna 포함) |
| **성우 분배 (13강~)** | **① 모든 해설·설명 문장은 한국어 성우만 사용한다. 해설 안에 영어 단어·구가 섞여 있어도(예: "could는 가능성을 말합니다") 영어 성우로 바꾸지 않는다. ② 독립 예문 구간(story)만 한국어 문장(KR) → 영어 문장(EN) 순서로 번갈아 읽는다.** |
| TTS 모델 / 포맷 | `eleven_multilingual_v2`, `mp3_44100_128`, 구간 사이 무음 0.2초 |
| 캔버스 | 1080×1920 (세로 숏폼), 30fps |
| 레이아웃 | 상단 모션 영역(STAGE_H 1300, 장면은 STAGE_DY 280 아래로 이동) + 하단 자막 영역(SUBTITLE_TOP 1300) |
| 색상 | 한국어 해설: 샌드/화이트 · 접속사 계열: and Teal · but Coral · or Blue · because Orange · where Green · when Violet · why Pink · how Gold |
| 톤 | 따뜻한 도시동화 2D 모션그래픽 |
| 커버(1~20강 공통) | `src/CourseCover.tsx`, 3초(90프레임), `{episodeNumber, title}`만 교체. 배경 `#0F0F1A→#1A1A2E`, 강조색 `#FF6648` |
| 커버 공식 사운드 | `public/sfx/MAGShim-Epic_magical_reveal_-Elevenlabs.mp3` (3.0초, 커버 0프레임부터 전체 재생). 영상마다 바꾸지 않는다 |
| 구간 전환창 | 설명이 끝나고 예문(story)이 시작되는 지점에 2초(60프레임) "예문활용" 중간창(`components/SectionBreak.tsx`). 이 구간은 무음·자막 없음. 타임라인(`timeline.ts`)이 자동으로 삽입한다 |
| 핵심 모션 | 비교급이 솟아나며(spring bounce, '뽁' 효과음) 오른쪽 구를 밀어내고, 완성 문장에 오렌지 글로우. 틀린 표현을 교체하는 `replaces` 모드도 사용 |
| 발음·표기 (15강~) | 마크다운 기호(~, ->, → 등)는 `speak()`가 TTS 전에 제거한다. 한국어 성우가 잘못 읽는 영단어는 `PRONUNCIATION_KR`로 음성에만 고쳐 쓴다(more→모어, many→메니, the→더). 자막과 음성 표기가 달라야 하면 `CueDef.say`(공백·문장부호만 다르게)를 쓴다. `say`가 있는 구간은 음절 단위 타이밍(`chars`)이 측정된다 (예: "어라? 이봐, 스, 머, 프!") |
| API 키 | 환경변수 `ELEVENLABS_API_KEY`만 사용. 코드·문서·채팅에 키를 적지 않는다 |

## 파일 역할 (src/, scripts/)
- `src/script.ts` 대본·장면 데이터 (영상마다 이것만 새로 작성)
- `src/voiceTiming.json` 실측 길이·단어 타이밍 (sync_timing.py가 생성)
- `src/timeline.ts` 실측 길이로 프레임 배치
- `src/Subtitle.tsx` 하단 자막(단어별 강조), `src/Background.tsx` 배경
- `src/components/BridgeSentence.tsx` 비교급 밀어내기 모션
- `src/CourseCover.tsx` 공통 3초 커버(공식 사운드 포함), `src/Root.tsx`에서 `Lesson16-Conjunctions` = 커버(0~89) + 본문(from 90)
- `src/scenes/*` 장면별 모션, `src/LectureVideo.tsx` 조립, 음성은 실측 타이밍(`measured: true`)일 때만 켜진다
- `scripts/generate_voice.py` `split_segments()` = 위 성우 분배 규칙 구현 (해설 1구간 KR, 예문 KR→EN)

## 새 영상 제작 순서
1. 새 폴더 `NEW BASIC COURSE NN`에 이 프로젝트를 복사한다 (`src`, `scripts`, `public/sfx`(커버 사운드 mp3 포함), `public/logo.png`, `package.json`, `remotion.config.ts`, `tsconfig.json`).
2. `src/script.ts`에 새 대본·장면을 작성하고 `scenes/*`를 필요한 만큼 수정한다.
3. `node scripts/export-cues.mjs` → (음성 전 미리보기용) `python3 scripts/estimate_timing.py`
4. `export ELEVENLABS_API_KEY=...` → `python3 scripts/generate_voice.py` → `python3 scripts/sync_timing.py` (whisper-cli + ffmpeg 필요, 실측으로 교체되며 음성이 켜진다)
5. `Root.tsx`에 강의 Composition을 추가한다: 커버 `episodeNumber`·`title`만 바꾸고 본문은 `from={90}`.
6. 코스 폴더에서 `npm run studio`로 미리보기, 이상 없으면 `npm run render`.
7. Studio는 반드시 코스 폴더에서 실행한다 (상위 폴더에서 실행하면 public/ 경로가 어긋나 음성이 재생되지 않는다).
