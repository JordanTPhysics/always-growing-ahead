# 24.22.1 is the Oct 21 2026 security release for the 24.x line.
FROM node:24.22.1-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

COPY lib/db ./lib/db

CMD ["npx", "tsx", "lib/db/migrate.ts"]
