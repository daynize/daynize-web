FROM node:22-alpine

WORKDIR /app

COPY gemini-live-test/package.json gemini-live-test/package-lock.json ./
RUN npm ci --omit=dev

COPY gemini-live-test/ ./
COPY ["DAYNIZE LOGO ONLY.png", "/DAYNIZE LOGO ONLY.png"]

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]