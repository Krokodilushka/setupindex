FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Baked into i18n baseUrl, canonical tags and the sitemap at build time.
# The runtime stage can still override NUXT_PUBLIC_SITE_URL for non-production hosts.
ARG NUXT_PUBLIC_SITE_URL=https://setupindex.com
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL

RUN npm run build

FROM node:24-alpine AS runtime

LABEL org.opencontainers.image.title="SetupIndex" \
      org.opencontainers.image.description="Multilingual creator setup directory (Nuxt SSR)" \
      org.opencontainers.image.source="https://github.com/Krokodilushka/setupindex" \
      com.setupindex.image="true"

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_PUBLIC_SITE_URL=https://setupindex.com

COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=4 \
  CMD wget -qO- http://127.0.0.1:3000/healthz | grep -qx 'ok'

CMD ["node", ".output/server/index.mjs"]
