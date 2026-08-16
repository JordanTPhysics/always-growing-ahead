FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

COPY lib/db ./lib/db

CMD ["npx", "tsx", "lib/db/migrate.ts"]
