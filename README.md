# SetupIndex

Multilingual directory of creator PCs, peripherals, and streaming gear. The MVP is built with Nuxt, server-rendered on every request, ships English and Russian URLs, and is designed for display ads and clearly disclosed affiliate links once monetization is enabled.

## Local development

Requirements: Node.js 24 and npm 11.

```bash
npm install
cp .env.example .env
npm run dev
```

The local SQLite database is created at `.data/setupindex.sqlite`. An empty database only receives the checked-in Drizzle schema; creator content is never seeded automatically.

In `npm run dev`, `/admin` shows a **Войти без WebAuthn** button for passwordless local access. That endpoint is compiled out of production behavior and returns 404 in a production build.

Production checks, in the order CI runs them:

```bash
npm run lint
npm run typecheck
npm run validate   # content invariants that types cannot express
npm run build
npm run smoke      # boots .output/server and asserts runtime behavior
npm run preview    # same server, for manual poking
```

`npm run validate` checks the portable import in `docs/imports/setupindex-creators.json`: creator and source integrity, local avatar files, duplicate slugs, SEO limits, and key parity between `en.json` and `ru.json`.

`npm run smoke` is the integration test. It covers what only exists at runtime: locale negotiation on `/`, localized 404s, security headers, JSON-LD in the server-rendered HTML, and sitemap contents.

Set `NUXT_PUBLIC_SITE_URL` when building for a non-production hostname. Production defaults to `https://setupindex.com`.

Set `NUXT_PUBLIC_YANDEX_METRIKA_ID` to enable Yandex Metrica. Under SSR this is read at runtime, so changing the counter needs a container restart, not a rebuild. The integration uses SPA mode and records an explicit page hit after each completed Nuxt navigation.

## Database and admin panel

Production creator records live in SQLite. The schema is declared in `server/database/schema.ts`; generated migrations live in `drizzle/`. Migrations never insert creators.

```bash
npx drizzle-kit generate
```

Open `/admin` to manage content. If no administrator credential exists yet, the first successfully registered WebAuthn passkey becomes the sole administrator. Afterwards the route only offers passkey authentication. The panel edits profile data, localized copy, equipment, sources, and social links. The creator list stays on the localized `/admin` route; editing opens `/admin/creators/:slug`, and creation opens `/admin/creators/new`.

The import section provides a downloadable JSON Schema, a create template, and an export of current records with concurrency versions. Imports are not retained. A confirmed batch is revalidated and applied in one SQLite transaction. Updates carry `expectedVersion`, so an older export cannot overwrite a record changed since it was downloaded.

The repository includes a complete clean-database content package:

- `docs/imports/setupindex-creators.json` — create-only import with active creators;
- `docs/imports/avatars/` — local WebP avatars referenced by the import;
- `docs/imports/avatar-sources.json` — official Twitch or YouTube source for each avatar.

To populate a clean installation, copy `docs/imports/avatars/*.webp` to `${NUXT_UPLOADS_PATH}/avatars/` and import `docs/imports/setupindex-creators.json` in `/admin`. The default local upload directory is `.data/uploads`; production uses `/data/uploads`. The database stores only `/uploads/avatars/...` paths, not image blobs.

Each equipment item points to one or more named sources. A source carries its editorial check date plus an optional original URL, source date, and bilingual description. The admin editor presents this as `source → equipment items`. Every saved creator page is indexable; there are no creator or equipment status fields.

Before publishing a new profile:

1. Prefer the creator's own setup page, video, stream command, or public post.
2. Record the source and the date it was checked for every item; add the direct URL and source date when available.
3. Add genuinely useful context in both languages.
4. Do not add an inactive profile without equipment to the portable import.

## SEO behavior

- Every public page has separate `/en/...` and `/ru/...` URLs.
- Canonical, `hreflang`, Open Graph locale, title, and description tags are generated server-side.
- Creator pages include `ProfilePage`, `Person`, breadcrumbs, equipment lists, and FAQ structured data where applicable.
- `/` is not a page. It negotiates a locale per visitor — the `setupindex_locale` cookie first, then `Accept-Language` with proper q-weights — and redirects. It is served `no-store` with `Vary: Accept-Language, Cookie` so no cache pins one language for everyone.
- Error pages are rendered in the locale of the requested URL, so `/ru/...` 404s are Russian.
- `sitemap_index.xml` and `robots.txt` are generated per request; every creator profile is included in the sitemap.
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

Configure this production secret:

| Secret | Value |
| --- | --- |
| `NUXT_SESSION_PASSWORD` | Random value of at least 32 characters used to seal administrator sessions and sign import previews |

The server needs Docker, Docker Compose, and `rsync`. The Compose service joins the existing external `traefik` network and publishes `setupindex.com` through the `websecure` entrypoint with the `letsencrypt` certificate resolver. Traefik must also have an HTTP-to-HTTPS redirect on the `web` entrypoint — this stack only defines a `websecure` router, so plain `http://setupindex.com` depends on that global rule.

Useful server commands:

```bash
cd /home/deploy/setupindex
docker compose ps
docker compose logs --tail=100 web
docker compose restart web
```

The container runs the Nitro server on port 3000 as a non-root user with a read-only root filesystem. Compose bind-mounts `/home/deploy/setupindex/data` to `/data` for SQLite and uploaded avatars. The deployment rsync explicitly excludes `data/`, so both remain untouched by a release upload. `SETUPINDEX_UID` and `SETUPINDEX_GID` match the deployment user so the container can write the database, WAL, SHM, and `/data/uploads` files. It serves its own static assets with pre-compressed gzip and brotli variants, and Traefik's `compress` middleware handles the rendered HTML. Health is exposed at `/healthz`, which both the image `HEALTHCHECK` and the Compose healthcheck poll.
