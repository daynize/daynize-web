#!/bin/bash
# Cloudflare Pages 배포용: 정적 사이트에 실제로 필요한 파일만 /tmp에 모아서 그 디렉터리를
# 배포한다. 저장소 루트를 통째로 올리면 VIDEOS/, NEW BASIC COURSE MASTER/ 등 대용량 영상
# 폴더 때문에 Pages의 파일당 25MiB 제한에 걸린다(영상은 R2에서 서비스한다).
set -e
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="/tmp/daynize-pages-deploy"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# 정적 사이트 루트 파일
for f in index.html favicon.ico "DAYNIZE LOGO ONLY.png" admin-gate.css admin-gate.js \
         auth-paywall-guard.js membership-status.js exit-quiz.css exit-quiz.js \
         notes.css notes.js pop-article.css courses.json robots.txt sitemap.xml CNAME; do
  cp "$SRC/$f" "$STAGE/$f"
done

# 정적 자산 디렉터리 (영상 없는 것들만)
for d in landing admin-gate courses payment public IMAGE audio src data fonts; do
  mkdir -p "$STAGE/$d"
  rsync -a "$SRC/$d/" "$STAGE/$d/"
done

# AI 튜터/음성 위젯이 실제로 fetch하는 클라이언트 모듈만 (서버 코드·node_modules 제외)
mkdir -p "$STAGE/gemini-live-test"
for f in audio.mjs pcm-worklet.mjs live-service.mjs audio-engine.mjs ambient-orb.mjs \
         session-safety.mjs tutor-widget.mjs daynize-tutor.mjs voice-studio-live.mjs \
         lesson-context.mjs spotlight-bar.css runtime-config.json; do
  cp "$SRC/gemini-live-test/$f" "$STAGE/gemini-live-test/$f"
done

echo "스테이징 완료: $STAGE ($(find "$STAGE" -type f | wc -l)개 파일)"

cd "$SRC"
npx wrangler pages deploy "$STAGE" --project-name=daynize --branch=main --commit-dirty=true
