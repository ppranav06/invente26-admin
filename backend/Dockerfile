FROM node:20-alpine

WORKDIR /usr/src/app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
