# BASIC COURSE · 개편 21강 완성 영상

21강 MP4 출력 및 규격·오디오 검증 완료. 총 45분 30초 / 161.2MB.

각 강의 130초, 1080×1920, 30fps, 3,900프레임. 지정 성우, 한국어→영어 예문, 대조 표시, #FF6648 핵심 강조와 실제 타임코드 기반 확대를 포함한다.

강의별 실제 발화 기준 35개 시점의 브라우저 실행·배치·모션·색상 대비 검사와 최종 MP4 오디오 디코딩을 통과했다. 단어별 자동 정렬은 근사값이며 전 강의 청취 검수가 완료된 상태는 아니다.

**웹사이트 게시와 courses.json 변경은 하지 않았다.**

| 강 | 주제 | 완성 영상 | 출력 장면 모음 | 크기 |
|---|---|---|---|---|
| 1 | 나 혼자서 할 수 있는 동사 | [MP4](renders/basic-01.mp4) | [장면 모음](renders/basic-01-contact.png) | 7.3MB |
| 2 | 전치사라는 지팡이가 필요한 순간 | [MP4](renders/basic-02.mp4) | [장면 모음](renders/basic-02-contact.png) | 7.5MB |
| 3 | 무엇을 주고, 누구에게 줄까요? | [MP4](renders/basic-03.mp4) | [장면 모음](renders/basic-03-contact.png) | 7.5MB |
| 4 | 그 사람을 무엇으로, 어떤 상태로? | [MP4](renders/basic-04.mp4) | [장면 모음](renders/basic-04-contact.png) | 7.6MB |
| 5 | 하게 하고, 하는 것을 보고 | [MP4](renders/basic-05.mp4) | [장면 모음](renders/basic-05-contact.png) | 7.7MB |
| 6 | 정보 두 개를 영어로 세는 법 | [MP4](renders/basic-06.mp4) | [장면 모음](renders/basic-06-contact.png) | 7.4MB |
| 7 | 과거의 일이 지금과 이어질 때 | [MP4](renders/basic-07.mp4) | [장면 모음](renders/basic-07-contact.png) | 7.6MB |
| 8 | 할 수 있다, 해야 한다, 안 해도 된다 | [MP4](renders/basic-08.mp4) | [장면 모음](renders/basic-08-contact.png) | 7.3MB |
| 9 | 하는 것을 문장의 한 자리에 넣기 | [MP4](renders/basic-09.mp4) | [장면 모음](renders/basic-09-contact.png) | 8.0MB |
| 10 | 먹을 것과 먹으러 가는 이유 | [MP4](renders/basic-10.mp4) | [장면 모음](renders/basic-10-contact.png) | 7.6MB |
| 11 | 누가 그 행동을 하기를 바라나요? | [MP4](renders/basic-11.mp4) | [장면 모음](renders/basic-11-contact.png) | 8.6MB |
| 12 | 멈춘 행동과 멈춘 이유는 달라요 | [MP4](renders/basic-12.mp4) | [장면 모음](renders/basic-12-contact.png) | 7.7MB |
| 13 | 직접 하는 대상과 영향을 받은 대상 | [MP4](renders/basic-13.mp4) | [장면 모음](renders/basic-13-contact.png) | 7.7MB |
| 14 | 감정을 일으키는 쪽과 느끼는 쪽 | [MP4](renders/basic-14.mp4) | [장면 모음](renders/basic-14-contact.png) | 8.0MB |
| 15 | 받는 사람과 전달되는 물건 | [MP4](renders/basic-15.mp4) | [장면 모음](renders/basic-15-contact.png) | 7.5MB |
| 16 | 수동태에서도 남는 보어 | [MP4](renders/basic-16.mp4) | [장면 모음](renders/basic-16-contact.png) | 8.2MB |
| 17 | 두 문장을 명사 하나로 연결하기 | [MP4](renders/basic-17.mp4) | [장면 모음](renders/basic-17-contact.png) | 7.7MB |
| 18 | 누구의 것인지, 무엇인지를 연결하기 | [MP4](renders/basic-18.mp4) | [장면 모음](renders/basic-18-contact.png) | 7.8MB |
| 19 | 장소·시간·이유·방법을 연결하기 | [MP4](renders/basic-19.mp4) | [장면 모음](renders/basic-19-contact.png) | 7.4MB |
| 20 | 지금의 가정과 과거의 가정을 나누기 | [MP4](renders/basic-20.mp4) | [장면 모음](renders/basic-20-contact.png) | 8.2MB |
| 21 | 정말 한다는 강조, 더 그렇다는 비교 | [MP4](renders/basic-21.mp4) | [장면 모음](renders/basic-21-contact.png) | 7.0MB |

## 재현 명령

```sh
node scripts/build-video.mjs all
node scripts/render-videos.mjs
node scripts/finalize-videos.mjs
```

원본 음성이나 대본 변경 시 오디오·정렬을 먼저 재생성한다. 렌더링은 입력 해시가 같은 검증된 결과를 재사용하며 각 강의 검사 실패 시 중단한다.
