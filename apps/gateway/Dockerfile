FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/gateway ./apps/gateway
COPY libs ./libs
COPY tsconfig.json nest-cli.json ./

RUN npm install

RUN npm run build gateway

CMD ["node", "dist/apps/gateway/src/main.js"]
