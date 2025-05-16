FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# 앱 폴더만 복사
COPY apps/auth ./apps/auth
COPY libs ./libs

# 루트에 tsconfig 파일 복사 (필수)
COPY tsconfig.json nest-cli.json ./

RUN npm install

# 앱별 빌드 명령
RUN npm run build auth

CMD ["node", "dist/apps/auth/src/main.js"]