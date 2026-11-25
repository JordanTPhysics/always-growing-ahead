# Xenova/multilingual-e5-small, quantized, MIT license.
# Separate from Next.js. About 2 GB RAM at runtime.
FROM node:24.22.1-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libgomp1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server.mjs ./
RUN mkdir -p /models && chown node:node /models

USER node
ENV NODE_ENV=production
ENV HF_HOME=/models
ENV TRANSFORMERS_CACHE=/models
ENV PORT=8000

RUN node --input-type=module -e "import { pipeline, env } from '@huggingface/transformers'; env.cacheDir = '/models'; await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' });"

EXPOSE 8000
CMD ["node", "server.mjs"]
