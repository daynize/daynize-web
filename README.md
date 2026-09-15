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

## 결제 연동 (PortOne)

`index.html`의 `requestPayment()` 함수에 PortOne 연동 지점이 주석으로 표시되어 있습니다. 실제 연동 시:

1. `<head>`에 PortOne 브라우저 SDK를 추가합니다.
2. `requestPayment()` 내 주석 처리된 `PortOne.requestPayment({...})` 블록의 `storeId`, `channelKey`를 실제 값으로 채우고 주석을 해제합니다.
3. 결제 성공/실패 응답을 서버로 전달해 검증하는 백엔드 로직이 별도로 필요합니다.
