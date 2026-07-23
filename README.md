# SetupIndex

Multilingual directory of creator PCs, peripherals, and streaming gear. The MVP is built with Nuxt, server-rendered on every request, ships English and Russian URLs, and is designed for display ads and clearly disclosed affiliate links once monetization is enabled.

## Local development

Requirements: Node.js 24 and npm 11.

```bash
npm install
npm run dev
```

Production checks, in the order CI runs them:

```bash
npm run lint
npm run typecheck
npm run validate   # content invariants that types cannot express
npm run build
npm run smoke      # boots .output/server and asserts runtime behavior
npm run preview    # same server, for manual poking
```

`npm run validate` fails on dangling `sourceIds`, duplicate slugs, missing or over-long SEO copy, mismatched keys between `en.json` and `ru.json`, and profiles marked `indexable` without sourced equipment.

`npm run smoke` is the integration test. It covers what only exists at runtime: locale negotiation on `/`, localized 404s, security headers, JSON-LD in the server-rendered HTML, and sitemap contents.

Set `NUXT_PUBLIC_SITE_URL` when building for a non-production hostname. Production defaults to `https://setupindex.com`.

Set `NUXT_PUBLIC_YANDEX_METRIKA_ID` to enable Yandex Metrica. Under SSR this is read at runtime, so changing the counter needs a container restart, not a rebuild. The integration uses SPA mode and records an explicit page hit after each completed Nuxt navigation.

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
- `/` is not a page. It negotiates a locale per visitor — the `setupindex_locale` cookie first, then `Accept-Language` with proper q-weights — and redirects. It is served `no-store` with `Vary: Accept-Language, Cookie` so no cache pins one language for everyone.
- Error pages are rendered in the locale of the requested URL, so `/ru/...` 404s are Russian.
- `sitemap_index.xml` and `robots.txt` are generated per request; research profiles are excluded from the sitemap.
- Search/filter query variants are marked `noindex` to avoid duplicate indexable pages.

## Container deployment

Pushes to `main` run linting, type-checking, content validation, an SSR build, the smoke test, and a Docker Buildx build. The workflow publishes immutable commit and `latest` tags to `ghcr.io/krokodilushka/setupindex-web`, uploads `compose.yaml` to `/home/deploy/setupindex/`, then runs `docker compose pull` and `docker compose up -d --wait`. Pull requests build the image for verification without publishing or deploying it.

The concurrency group is keyed by ref, so a pull request build cannot cancel a production rollout, and `main` never cancels itself mid-deploy.

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

The server needs Docker, Docker Compose, and `rsync`. The Compose service joins the existing external `traefik` network and publishes `setupindex.com` through the `websecure` entrypoint with the `letsencrypt` certificate resolver. Traefik must also have an HTTP-to-HTTPS redirect on the `web` entrypoint — this stack only defines a `websecure` router, so plain `http://setupindex.com` depends on that global rule.

Useful server commands:

```bash
cd /home/deploy/setupindex
docker compose ps
docker compose logs --tail=100 web
docker compose restart web
```

The container runs the Nitro server on port 3000 as the non-root `node` user with a read-only root filesystem. It serves its own static assets with pre-compressed gzip and brotli variants, and Traefik's `compress` middleware handles the rendered HTML. Health is exposed at `/healthz`, which both the image `HEALTHCHECK` and the Compose healthcheck poll.
