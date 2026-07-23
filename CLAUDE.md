# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # postinstall runs `nuxt prepare` (generates .nuxt types + eslint config)
npm run dev          # dev server
npm run lint         # eslint . (lint:fix to autofix)
npm run typecheck    # nuxt typecheck (vue-tsc); nuxt.config sets typescript.typeCheck: false, so build does NOT type-check
npm run validate     # content invariants (node strips the TS natively, no build needed)
npm run build        # SSR build into .output/server + .output/public
npm run smoke        # boots the built server and asserts runtime behavior
npm run preview      # node .output/server/index.mjs
```

CI order is `lint` → `typecheck` → `validate` → `build` → `smoke`; run all five before calling a change done. There is no unit-test framework — [scripts/smoke.mjs](scripts/smoke.mjs) is the integration test, and it is the only thing that catches locale negotiation, localized errors, response headers, and sitemap contents, because none of those exist until the server runs.

[scripts/validate-content.ts](scripts/validate-content.ts) covers what the types cannot: dangling/unused `sourceIds`, duplicate slugs, date sanity, SEO length limits, `en.json`/`ru.json` key parity, and `indexable` profiles without sourced equipment. A typo in `sourceIds` otherwise fails silently — [EquipmentCard.vue](app/components/EquipmentCard.vue#L11) just renders the item with no source link, which is exactly the failure the project exists to prevent.

`NUXT_PUBLIC_SITE_URL` is baked at build time (i18n `baseUrl`, canonicals, sitemap) and defaults to `https://setupindex.com`. `NUXT_PUBLIC_YANDEX_METRIKA_ID` is read at **runtime**, so changing the counter is a container restart, not a rebuild; empty disables the plugin entirely.

## Architecture

Nuxt 4 server-rendered app (Nitro `node-server` preset), no CMS, no database. All content is a single typed TypeScript array compiled into the bundle, so publishing content still means a rebuild and redeploy.

### Content is code, and it drives the build

`app/data/creators.ts` exports `creators: Creator[]` (types in `app/types/content.ts`). This file is imported **three** times with different consequences:

1. By pages/components, rendered on the server per request.
2. By `nuxt.config.ts` at config-evaluation time — it derives `sitemap.urls` and `sitemap.exclude` from the array.
3. By `scripts/validate-content.ts`, run by bare Node with native type stripping.

`indexable: false` is the switch that keeps a profile out of the sitemap (via `excludedCreatorRoutes`) — the route still renders, and `[slug].vue` emits `robots: noindex, follow` for it. `updatedAt` becomes the sitemap `lastmod`. Keep the multi-import in mind: `creators.ts` must stay side-effect-free and importable outside the Nuxt runtime — plain TS, relative imports, no `~/` aliases, no auto-imported composables, and nothing Node's type stripping rejects (no `enum`, no `namespace`).

### Evidence model

The editorial contract is encoded in the types, not just docs. Every `EquipmentItem` carries `status` (`confirmed` | `reported` | `historical`) and `sourceIds` pointing into the creator's own `sources: Source[]`, each with `url` and `checkedAt`. `EquipmentCard` renders the status badge and resolves source IDs. Do not add equipment without a matching source entry, and default to `reported` unless the creator confirmed it directly. Creators with no verified content use the `researchContent()` helper at the top of `creators.ts` plus `indexable: false` and `verificationStatus: 'research'`.

### Localization

Two locales, `strategy: 'prefix'` — every public URL is `/en/...` or `/ru/...`, there is no unprefixed route. `/` is handled by `@nuxtjs/i18n` at request time: `detectBrowserLanguage` reads the `setupindex_locale` cookie first, then `Accept-Language` with q-weights, and redirects. This only works because there is a server; the smoke test pins all three cases, including the en-first-but-accepts-ru visitor.

Two parallel translation mechanisms coexist:

- **UI strings**: `i18n/locales/{en,ru}.json`, accessed with `t()`. Both files must stay key-identical.
- **Per-creator prose**: `Creator.content` is `Record<LocaleCode, CreatorLocaleContent>` (seoTitle/seoDescription/eyebrow/intro/verdict), and free-text fields elsewhere use `LocalizedText` read through `localize()` in `app/utils/content.ts`. Content is authored, not machine-translated — Russian copy is written natively, not as a literal translation of the English.

Use `useLocalePath()` for internal links; never hardcode `/en/...`.

### SEO layer

Each page sets `useSeoMeta` plus a `useHead` JSON-LD block built through `safeJsonLd()` (escapes `<` to avoid script-tag breakout). Pages with query parameters (`?q=`, filter state on `/creators`) flip `robots` to `noindex, follow` and drop their JSON-LD, matching the `disallow` rules in `nuxt.config.ts`'s robots config. Structured data on a profile is a `@graph` of ProfilePage/Person + BreadcrumbList + ItemList (equipment) + FAQPage. If you add a page, mirror this pattern rather than inventing a new one.

### Deploy path

`.github/workflows/deploy.yml`: verify job runs the five checks, then Buildx builds `Dockerfile` and pushes `ghcr.io/krokodilushka/setupindex-web:{sha,latest}`. PRs build but do not push or deploy. The deploy job rsyncs only `compose.yaml` to `/home/deploy/setupindex`, writes `.env` with `SETUPINDEX_IMAGE_TAG=$GITHUB_SHA` and the Metrica ID, and runs `docker compose up -d --wait`.

`Dockerfile` is multi-stage and self-contained: it installs with `npm ci --ignore-scripts` (the app's own `postinstall` needs source that isn't copied yet; esbuild still resolves its platform binary through optional deps), builds, and copies only `.output` into a `node:24-alpine` runtime. The container runs as `node` on port 3000 with a read-only root filesystem and a `/tmp` tmpfs — anything that needs to write at runtime will fail, by design.

`server/routes/healthz.ts` backs both the image `HEALTHCHECK` and the Compose healthcheck; both match the body exactly, so it must stay `ok\n`.

There is no reverse proxy in the image. TLS, the `setupindex.com` host rule, and HTML compression all live in the Compose Traefik labels. Response headers — including the security headers — come from `routeRules` in `nuxt.config.ts`, which is now the single place that defines them.

## Conventions

- Nuxt auto-imports are on for composables and `app/components/`; `app/data`, `app/types`, and `app/utils` are imported explicitly with relative paths.
- Nitro returns a JSON error body unless the request sends `Accept: text/html`. When testing error pages with `curl` or `fetch`, send that header or you will see JSON and think the error page is broken.
- 2-space indent, LF, no semicolons-required style enforced by `@nuxt/eslint`; `vue/multi-word-component-names` is off.
- `dist` is a symlink to `.output/public` and is gitignored.
