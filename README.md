# Daynize 랜딩 페이지

보험/금융 영업인을 위한 OCR 생산성 도구 **Daynize(데이나이즈)**의 랜딩 페이지입니다.
Tailwind CSS(CDN)와 FontAwesome(CDN)만 사용하는 단일 파일(`index.html`) 정적 사이트라 별도 빌드 없이 바로 배포할 수 있습니다.

## 로컬에서 미리보기

빌드 과정이 필요 없으므로 `index.html`을 브라우저에서 바로 열거나, 로컬 서버로 띄워도 됩니다.

```bash
npx serve .
```

## GitHub Pages 배포

1. 이 폴더 내용을 GitHub 저장소에 푸시합니다. (아래 "Git 저장소 초기화" 참고)
2. GitHub 저장소 → **Settings → Pages**로 이동합니다.
3. **Source**를 `Deploy from a branch`로 선택하고, 브랜치는 `main`, 폴더는 `/ (root)`로 지정합니다.
4. 저장하면 몇 분 내로 `https://<사용자명>.github.io/<저장소명>/`에서 접속할 수 있습니다.
5. 커스텀 도메인(`www.daynize.co.kr`)을 쓰려면 저장소에 포함된 `CNAME` 파일이 이미 도메인을 지정하고 있습니다. 도메인 등록업체(DNS)에서 GitHub Pages로 향하는 `CNAME`/`A` 레코드를 설정한 뒤, Settings → Pages → Custom domain에서 같은 도메인을 입력하고 저장하세요.
   - GitHub Pages가 요구하는 DNS 값: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

## Cloudflare Pages 배포

### 방법 A. Git 연동 (권장)

1. GitHub에 저장소를 푸시합니다.
2. Cloudflare 대시보드 → **Workers & Pages → Create → Pages → Connect to Git**에서 이 저장소를 선택합니다.
3. 빌드 설정:
   - **Build command**: 비워둡니다 (빌드 불필요)
   - **Build output directory**: `/`
4. 배포 후 `*.pages.dev` 주소가 발급됩니다.
5. 커스텀 도메인은 Pages 프로젝트 → **Custom domains**에서 `www.daynize.co.kr`을 추가하고 안내되는 DNS 레코드를 등록하면 됩니다.

### 방법 B. Wrangler CLI로 직접 업로드 (Git 없이)

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name=daynize
```

## Git 저장소 초기화 & GitHub 푸시 (아직 안 했다면)

```bash
cd /Users/sigeol-i/Desktop/daynize-web
git init
git add .
git commit -m "Initial commit: Daynize landing page"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
```

## 파일 구성

- `index.html` — 랜딩 페이지 전체 (히어로, OCR 데모, 요금제, 후기, 푸터 포함)
- `CNAME` — GitHub Pages 커스텀 도메인 설정 (`www.daynize.co.kr`)
- `.nojekyll` — GitHub Pages의 Jekyll 처리를 건너뛰기 위한 빈 파일
- `.gitignore` — OS/도구 관련 불필요한 파일 제외

## 결제 연동 (PortOne) — CMP-33

`index.html`의 `<script>` 마지막 블록(`PortOne 결제 (CMP-33)` 주석 아래)에 실제 연동 코드가 구현되어 있습니다. "가격" 섹션(`#pricing`)의 "구독하기" 버튼 → `openCheckoutModal()` → 결제 수단 선택 → `submitPayment()` 순서로 동작하며, 백엔드의 `POST /payments/request` → PortOne 결제창 → `POST /payments/verify` 흐름을 그대로 따릅니다.

**배포 전 채워야 하는 값 (현재 placeholder):**

1. `DAYNIZE_API_BASE` — 백엔드가 아직 공개 도메인에 배포되어 있지 않아 placeholder(`https://api.daynize.co.kr`)로 두었습니다. 실제 배포 URL이 정해지면 이 상수를 교체하세요.
2. `DAYNIZE_PORTONE_CHANNEL_KEY` — PortOne 콘솔에서 카드사 승인 완료 후 발급되는 채널 키입니다. 현재 `.env.example`에는 `storeId`/`apiSecret`/`webhookSecret`만 있고 채널 키가 없어 비워둔 상태입니다.
3. `DAYNIZE_TOKEN_KEY`(`daynize_access_token`) — 로그인 후 `localStorage`에 저장되어야 하는 액세스 토큰 키입니다. 이 랜딩 페이지에는 로그인 UI가 없으므로, 로그인/세션 기능이 있는 화면에서 로그인 성공 시 이 키로 토큰을 저장해 주어야 결제 버튼이 동작합니다.

채널 키가 비어 있는 동안에는 "구독하기"를 눌러도 결제창이 아니라 기존 "서비스 준비 안내" 모달(`openNoticeModal()`)이 뜨도록 안전장치를 넣어두었습니다 — 위 값들이 채워지면 자동으로 실제 결제 흐름으로 전환됩니다.
