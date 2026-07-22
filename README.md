# SetupIndex

Multilingual static directory of creator PCs, peripherals, and streaming gear. The MVP is built with Nuxt, ships English and Russian URLs, and is designed for display ads and clearly disclosed affiliate links once monetization is enabled.

## Local development

Requirements: Node.js 24 and npm 11.

```bash
npm install
npm run dev
```

Production checks:

```bash
npm run lint
npm run typecheck
npm run generate
npx serve .output/public
```

Set `NUXT_PUBLIC_SITE_URL` when generating for a non-production hostname. Production defaults to `https://setupindex.com`.

Set `NUXT_PUBLIC_YANDEX_METRIKA_ID` to enable Yandex Metrica. The integration uses SPA mode and records an explicit page hit after each completed Nuxt navigation.

## Content model

Creator records live in `app/data/creators.ts`. Each equipment claim has its own source URL, source label, and checked date. Only profiles with enough sourced content use `indexable: true`; research placeholders receive `noindex, follow` and are excluded from the explicit sitemap list.

Before publishing a new profile:

1. Prefer the creator's own setup page, video, stream command, or public post.
2. Record a direct URL and the date it was checked for every item.
3. Use `reported` unless the creator directly confirmed the item.
4. Add genuinely useful context in both languages; do not index thin placeholder pages.

## SEO behavior

- Every public page has separate `/en/...` and `/ru/...` URLs.
- Canonical, `hreflang`, Open Graph locale, title, and description tags are generated server-side.
- Creator pages include `ProfilePage`, `Person`, breadcrumbs, equipment lists, and FAQ structured data where applicable.
- Static generation outputs HTML for all routes and generates a localized `sitemap_index.xml` plus `robots.txt`.
- Search/filter query variants are marked `noindex` to avoid duplicate indexable pages.

## Container deployment

Pushes to `main` run linting, type-checking, and static generation. The workflow uploads the generated site together with `Dockerfile`, `compose.yaml`, and the Nginx configuration to `/home/deploy/setupindex/`. It then builds the image on the server and runs `docker compose up -d --wait`. Pull requests only run verification.

Configure the `production` environment in GitHub and add these repository or environment secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Server hostname or IP |
| `DEPLOY_USER` | SSH user with write access to `/home/deploy/setupindex` |
| `DEPLOY_PORT` | Optional SSH port; defaults to `22` |
| `DEPLOY_SSH_KEY` | Private deployment key |
| `DEPLOY_KNOWN_HOSTS` | Optional pinned host key from `ssh-keyscan -H your-host`; otherwise SSH trusts the first seen key |

Configure these non-sensitive repository variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_PATH` | `/home/deploy/setupindex` |
| `NUXT_PUBLIC_YANDEX_METRIKA_ID` | Yandex Metrica counter ID; leave unset to disable analytics |

The server needs Docker, Docker Compose, and `rsync`. The Compose service joins the existing external `traefik` network and publishes `setupindex.com` through the `websecure` entrypoint with the `letsencrypt` certificate resolver.

Useful server commands:

```bash
cd /home/deploy/setupindex
docker compose ps
docker compose logs --tail=100 web
docker compose restart web
```

Node.js is not required on the server. Nginx serves the generated files from the container, including immutable caching for Nuxt assets, locale-aware root redirects, health checks, and static 404 handling.
