# BASIC COURSE · 21강 실제 오디오

21강 음성 525개와 믹스 트랙 21개 생성·디코딩 완료. 영어 예문 210개 / 1699개 단어 / 강조 구문 자동 정렬 완료.

모든 믹스는 130초다. 단어 시각은 원본 문장별 자동 정렬 근사값이며 청취 검수가 남아 있다. 6강 so 한 토큰은 시작 시점만 있고 길이는 미확정이다. 임의의 길이는 만들지 않았다.

**개편 21강 MP4는 아직 렌더링하지 않았다. 기존 catalog와 lessons 문서는 대본 단계의 계획 스냅샷이며 최신 제작 상태는 production-status.json과 이 문서를 기준으로 확인한다.**

| 강 | 주제 | 음성 듣기 | 실제 타임코드 | 자막 | 피크 |
|---|---|---|---|---|---|
| 1 | 나 혼자서 할 수 있는 동사 | [WAV](audio/01/narration.wav) | [타임코드](audio-timelines/01.md) | [VTT](audio-timelines/01.vtt) | -0.2dB |
| 2 | 전치사라는 지팡이가 필요한 순간 | [WAV](audio/02/narration.wav) | [타임코드](audio-timelines/02.md) | [VTT](audio-timelines/02.vtt) | -1.7dB |
| 3 | 무엇을 주고, 누구에게 줄까요? | [WAV](audio/03/narration.wav) | [타임코드](audio-timelines/03.md) | [VTT](audio-timelines/03.vtt) | -1.9dB |
| 4 | 그 사람을 무엇으로, 어떤 상태로? | [WAV](audio/04/narration.wav) | [타임코드](audio-timelines/04.md) | [VTT](audio-timelines/04.vtt) | -1.7dB |
| 5 | 하게 하고, 하는 것을 보고 | [WAV](audio/05/narration.wav) | [타임코드](audio-timelines/05.md) | [VTT](audio-timelines/05.vtt) | -2dB |
| 6 | 정보 두 개를 영어로 세는 법 | [WAV](audio/06/narration.wav) | [타임코드](audio-timelines/06.md) | [VTT](audio-timelines/06.vtt) | -1.6dB |
| 7 | 과거의 일이 지금과 이어질 때 | [WAV](audio/07/narration.wav) | [타임코드](audio-timelines/07.md) | [VTT](audio-timelines/07.vtt) | -1.8dB |
| 8 | 할 수 있다, 해야 한다, 안 해도 된다 | [WAV](audio/08/narration.wav) | [타임코드](audio-timelines/08.md) | [VTT](audio-timelines/08.vtt) | -1.9dB |
| 9 | 하는 것을 문장의 한 자리에 넣기 | [WAV](audio/09/narration.wav) | [타임코드](audio-timelines/09.md) | [VTT](audio-timelines/09.vtt) | -1.7dB |
| 10 | 먹을 것과 먹으러 가는 이유 | [WAV](audio/10/narration.wav) | [타임코드](audio-timelines/10.md) | [VTT](audio-timelines/10.vtt) | -1.3dB |
| 11 | 누가 그 행동을 하기를 바라나요? | [WAV](audio/11/narration.wav) | [타임코드](audio-timelines/11.md) | [VTT](audio-timelines/11.vtt) | -1.7dB |
| 12 | 멈춘 행동과 멈춘 이유는 달라요 | [WAV](audio/12/narration.wav) | [타임코드](audio-timelines/12.md) | [VTT](audio-timelines/12.vtt) | -2dB |
| 13 | 직접 하는 대상과 영향을 받은 대상 | [WAV](audio/13/narration.wav) | [타임코드](audio-timelines/13.md) | [VTT](audio-timelines/13.vtt) | -1.3dB |
| 14 | 감정을 일으키는 쪽과 느끼는 쪽 | [WAV](audio/14/narration.wav) | [타임코드](audio-timelines/14.md) | [VTT](audio-timelines/14.vtt) | -1.9dB |
| 15 | 받는 사람과 전달되는 물건 | [WAV](audio/15/narration.wav) | [타임코드](audio-timelines/15.md) | [VTT](audio-timelines/15.vtt) | -0.6dB |
| 16 | 수동태에서도 남는 보어 | [WAV](audio/16/narration.wav) | [타임코드](audio-timelines/16.md) | [VTT](audio-timelines/16.vtt) | -0.9dB |
| 17 | 두 문장을 명사 하나로 연결하기 | [WAV](audio/17/narration.wav) | [타임코드](audio-timelines/17.md) | [VTT](audio-timelines/17.vtt) | -1.7dB |
| 18 | 누구의 것인지, 무엇인지를 연결하기 | [WAV](audio/18/narration.wav) | [타임코드](audio-timelines/18.md) | [VTT](audio-timelines/18.vtt) | -1.7dB |
| 19 | 장소·시간·이유·방법을 연결하기 | [WAV](audio/19/narration.wav) | [타임코드](audio-timelines/19.md) | [VTT](audio-timelines/19.vtt) | -1.9dB |
| 20 | 지금의 가정과 과거의 가정을 나누기 | [WAV](audio/20/narration.wav) | [타임코드](audio-timelines/20.md) | [VTT](audio-timelines/20.vtt) | -1.8dB |
| 21 | 정말 한다는 강조, 더 그렇다는 비교 | [WAV](audio/21/narration.wav) | [타임코드](audio-timelines/21.md) | [VTT](audio-timelines/21.vtt) | -0.8dB |

재생성: node scripts/audio.mjs [강 번호] / 정렬: ALIGN_MODEL=small.en node scripts/align-audio.mjs [강 번호] / 검수: node scripts/verify-audio.mjs

음성 재생성은 측정 타임라인을 다시 만들므로 이후 정렬 명령도 다시 실행해야 한다. 콘텐츠 해시 캐시는 대본·성우·말속도 변경 시 새 파일을 사용한다.
