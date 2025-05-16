FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/event ./apps/event
COPY libs ./libs
COPY tsconfig.json nest-cli.json ./

RUN npm install

RUN npm run build event

CMD ["node", "dist/apps/event/main.js"]
