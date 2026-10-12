# 데이나이즈 (Daynize) SEO 배포

## 도메인 기준

- 대표 도메인: `https://www.daynize.co.kr`
- 별칭 도메인: `https://daynize.co.kr`
- CNAME은 기존의 `www.daynize.co.kr`을 유지합니다.
- canonical, Open Graph URL, WebSite JSON-LD, sitemap은 대표 www 주소로 통일합니다.
- 중복 색인을 피하기 위해 sitemap에 비-www 페이지를 별도로 추가하지 않습니다.
- Cloudflare 또는 실제 호스팅에서 비-www → www 영구 리다이렉트(301/308)를 설정하고 경로·쿼리를 유지하세요. 두 도메인 모두 DNS와 HTTPS 인증서가 필요합니다.
- 리다이렉트는 이 저장소만 수정해서 설정되지 않습니다. Cloudflare 콘솔과 원본 호스팅의 Custom Domain 설정을 확인해야 합니다.

## 배포 대상

상위 Daynize 정적 사이트의 `index.html`, `robots.txt`, `sitemap.xml`과 K-ECHO 빌드 결과를 함께 배포합니다.
검색엔진은 도메인 루트의 `/robots.txt`를 사용합니다. Vite `public` 파일은 `/kecho/` 빌드 폴더로 복사되므로,
`public/robots.txt`만 배포해서는 루트 설정을 대체할 수 없습니다. 루트와 public의 크롤러 파일은 같은 내용으로 유지합니다.

홈 제목은 `데이나이즈 (Daynize) | 일상 대사로 배우는 지난주 영어`입니다.
홈과 K-ECHO에 한글 브랜드 우선 메타 태그와 공식 명칭 `데이나이즈`, 별칭 `Daynize`의 WebSite JSON-LD를 추가했습니다.
이미지는 기존 `DAYNIZE LOGO ONLY.png`를 사용합니다. 배포 후 이미지 URL도 공개적으로 접근 가능해야 합니다.
구조화 데이터와 메타 태그는 사이트명을 알리는 신호이며 검색 노출, 순위, 자동 교정 방지를 보장하지 않습니다.

## API와 환경 변수

- FastAPI CORS는 `https://www.daynize.co.kr`과 `https://daynize.co.kr`을 허용합니다.
- 실제 배포 환경에 `KECHO_CORS_ORIGINS`가 있다면 기본 목록을 덮어쓰므로 `.env.example`과 동일한 두 주소를 설정하세요.
- 프론트엔드 `.env.production`의 API 기본값은 `https://www.daynize.co.kr`입니다.
- Vite 개발 프록시는 배포되지 않습니다. 대표 도메인의 `/api/*`를 실제 K-ECHO FastAPI 원본으로 연결해야 합니다.
- 별도 API 도메인을 사용한다면 Cloudflare 빌드 변수 `VITE_KECHO_API_BASE`를 해당 공개 HTTPS origin으로 지정하고 재빌드하세요.
- 기존 Node/Fly 음성 중계 서버는 K-ECHO 검색 API와 다릅니다. `/api/search`를 그 서버에 연결하면 안 됩니다.
- HTTPS 페이지의 API 원본으로 로컬 주소나 잘못된 `daynize.com` 주소를 지정하면 운영 빌드가 실패합니다.
- `.env.production`이 저장소의 ignore 규칙에 해당하면 Cloudflare 빌드 환경에 `VITE_KECHO_API_BASE=https://www.daynize.co.kr`을 반드시 별도로 설정하세요.

## 포털 소유권 확인

Google Search Console과 Naver Search Advisor에서 사이트를 등록하고 확인 값을 받아야 합니다.
홈 정적 HTML의 주석 위치에 실제 확인 메타 태그를 넣고 배포합니다. 임시 `TOKEN` 값을 그대로 게시하지 마세요.
K-ECHO HTML은 `VITE_GOOGLE_SITE_VERIFICATION`, `VITE_NAVER_SITE_VERIFICATION` 빌드 변수가 있을 때만 확인 태그를 넣습니다.
대표 사이트 루트의 소유권 확인은 K-ECHO 하위 페이지의 확인 태그만으로 대체되지 않습니다.
Google 도메인 속성을 사용한다면 별도로 제공되는 DNS TXT 확인 방식을 사용하세요.

배포 후 두 포털에 `https://www.daynize.co.kr/sitemap.xml`을 제출하고 홈과 `/kecho/`의 재수집을 요청하세요.
확인 토큰, DNS 수정, 포털 제출은 계정 권한이 필요하므로 코드 변경만으로 완료되지 않습니다.

## 검증

```sh
cd kecho-backend
python -m unittest discover -s tests -v
cd ../kecho-frontend
npm run typecheck
npm run build -- --outDir dist
```

위 빌드는 검증용 `dist`에 출력합니다. 운영 기본 빌드 `npm run build`는 상위 정적 사이트의 `kecho` 폴더를 비우고 재생성하므로
배포 준비 시 그 폴더의 사용자 변경 내용을 먼저 확인하세요. 검증용 빌드만으로 실제 서비스가 갱신되지는 않습니다.
배포된 홈, canonical, `/robots.txt`, `/sitemap.xml`, OG 이미지가 HTTPS로 200 응답을 반환하는지 확인하세요.