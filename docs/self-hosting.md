# Self-hosting Dash

Dash runs entirely in the browser. `pnpm build` uses Next's `output: 'export'`, so the whole app is
a folder of static files with no server-side code, no API routes and no database to run. DuckDB
executes in a WASM worker and your data stays on your machine.

That means any static file host can serve it: an S3 bucket behind CloudFront, GitHub Pages, Cloudflare
Pages, nginx, Caddy, or `python -m http.server` for a quick look.

## Getting the bundle

Download `dash-web-<version>.zip` from a release and unzip it:

```
dash-web-<version>/
├── README.md    this document
└── site/        upload the contents of this folder
```

Or build it yourself:

```bash
pnpm install
pnpm build:static     # writes dist-web/dash-web-<version>.zip and the unpacked folder
```

`pnpm build` alone is enough if you only want the raw export in `out/`.

## Requirements

**1. Serve it at the root of an origin.** Assets are referenced absolutely (`/_next/...`), so the app
must live at `https://your-host/` and not at `https://your-host/dash/`. To host under a subpath,
rebuild with a base path set in `next.config.mjs` (`basePath` and `assetPrefix`).

**2. Serve it over HTTPS.** Project persistence uses OPFS, which browsers only expose in a secure
context. Over plain HTTP (this includes the S3 website endpoint, which is HTTP-only) Dash still runs
but falls back to an in-memory database, so projects are lost on reload. `localhost` counts as secure,
which is why local previews work without TLS.

**3. Serve the app shell for unknown paths.** Routing is client-side over the History API, so a hard
load of `/projects/abc` asks the host for a file that does not exist. `404.html` in the bundle is a
complete app shell, so pointing the host's 404 handler at it is enough. Rewriting unknown paths to
`/index.html` works equally well.

**4. Allow outbound requests to `cdn.jsdelivr.net`.** The DuckDB WASM bundles are fetched from
jsDelivr at runtime rather than shipped in the export, so the bundle is not usable air-gapped.

**5. Optional: set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy:
require-corp`.** These make the page cross-origin isolated, which lets DuckDB pick its multi-threaded
build and is also required by the MotherDuck connection. Without them DuckDB automatically selects
its single-threaded build, so everything still works, just slower on large queries.

## AWS: S3 plus CloudFront

The S3 website endpoint cannot do HTTPS or custom response headers, so put CloudFront in front of a
private bucket.

**Upload the files.** Content types are inferred from the file extensions, which is all this bundle
needs:

```bash
aws s3 sync ./site/ s3://your-bucket/ --delete
```

**Create the distribution** with the bucket as an S3 origin using Origin Access Control, and set
`index.html` as the default root object. Then add:

- **Custom error responses** so deep links resolve. Map HTTP 403 and 404 to `/404.html` with a 200
  response code. CloudFront returns 403 rather than 404 for missing keys on an OAC origin, so both
  are needed.
- **A response headers policy** (optional, see requirement 5) adding `Cross-Origin-Opener-Policy:
  same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

**Invalidate on deploy.** Filenames under `/_next/static/` are content-hashed and safe to cache
forever, but the HTML entry points are not, so invalidate them after each upload:

```bash
aws cloudfront create-invalidation --distribution-id EXAMPLE123 --paths '/' '/index.html' '/404.html'
```

## Other hosts

- **GitHub Pages**: push `site/` to the branch Pages serves. It already serves `404.html` for unknown
  paths, and HTTPS is on by default. Custom headers are not available, so DuckDB stays single-threaded.
- **Cloudflare Pages / Netlify / Vercel**: upload `site/` as the output directory. Add the two
  cross-origin headers through the platform's headers config. The repo's own `vercel.json` shows the
  equivalent setup.
- **nginx**: `root /srv/dash/site;` plus `location / { try_files $uri $uri/ /index.html; }`, and
  `add_header` for the two cross-origin headers.

## Notes

- Nothing phones home. The build includes the Vercel Analytics client, which loads its script from a
  same-origin `/_vercel/insights/` path; off Vercel that request 404s and no analytics are collected.
- LLM features are configured per user in the app's settings and call the provider straight from the
  browser. There is no server component holding an API key.
- Users who want a desktop app with native DuckDB instead of WASM can use the Electron builds from
  the same release.
