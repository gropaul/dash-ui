# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (webpack)
pnpm build            # Production build (static export to out/)
pnpm lint             # ESLint
pnpm tsc              # TypeScript type-check (no emit)
pnpm test             # Vitest unit tests (watch)
pnpm test:run         # Vitest once
pnpm test:ui          # Vitest with UI
pnpm test:e2e         # Playwright end-to-end tests (web + electron projects)

pnpm electron:dev     # Run the desktop shell against the dev server
pnpm electron:preview # Run the desktop shell against out/
pnpm electron:build   # next build + electron-builder --mac
```

Deeper design docs live in `/docs` (`projects.md`, `routing.md`, `ci.md`, `self-hosting.md`);
`/src/state/docs.md` covers app init order. Scratch planning notes are in `/dev`.

## Architecture

This is a data exploration tool built on **DuckDB** for SQL execution. Users connect data sources,
write SQL queries, and compose them on pages. It ships both as a browser app
(DuckDB WASM) and as an Electron desktop app (native DuckDB).

### Key layers

- **`src/app/`** - Next.js App Router, but only a single static shell (`page.tsx` + `not-found.tsx`).
  The root layout is a client component wrapping ThemeProvider → ResponsiveModeProvider →
  SettingsProvider → `AppGate`, plus TourDialog, Toaster and ConditionalAnalytics.
- **`src/state/`** - global state via **Zustand**, plus most of the non-UI logic:
  - Stores: `workspace/workspace.state.ts` (the project's files), `workspace/surfaces.state.ts` (what each
    query and page block shows, in memory), `relations-data.state.ts`, `projects.state.ts`,
    `database.state.ts`, `data-sources.state.ts`, `chat.state.ts`, `language-model.state.ts`, `gui.state.ts`,
    `init.state.ts`, `monaco.state.ts`, `onboarding.state.ts`, `save-status.state.ts`.
  - The workspace is saved into the project's DuckDB (see below); `chat`, `database`, `gui`, `language-model`
    (stored obfuscated) and `workspace/file-stats.state.ts` persist to localStorage. The rest are in-memory.
  - Subfolders: `workspace/` (files, paths, page text, references), `connections/` (backends),
    `persistency/` (storage seam), `routing/`, `projects/`, `relations/` (actions, events, SQL/DAG), `init/`,
    `sources/`.
- **`src/components/`** - feature-organized React components: `canvas/`, `dashboard/`, `page-editor/`, `relation/`,
  `workspace/` (file actions and dialogs), `workbench/`, `layout/`, `chat/`, `catalog/`, `projects/`,
  `connections/`, `onboarding/`, `ui/` (shadcn).
- **`src/model/`** - TypeScript interfaces for domain objects (RelationState, RelationViewState,
  Project, ColumnStats, …).
- **`src/platform/`** - utilities and shared constants: `global-data.ts` (catalog names, limits,
  defaults - the single source of truth for magic values), `sql-utils`, `colors-utils`,
  `async-queue`, `electron.ts`, LRU cache, number/string/object utils.
- **`electron/`** - desktop shell: `main.js` (custom `app://` protocol serving `out/`),
  `preload.cjs` exposing `window.dashNative`, `duckdb.cjs` (native DuckDB via `@duckdb/node-api`), `agents.cjs`
  (starts ACP agents for the chat panel, `src/state/agent/`) and `mcp.cjs` (relays Dash's MCP server to agents on
  localhost; the server itself runs in the app, `state/agent/dash-mcp.ts`: read-only queries and the workspace files).

### Connections

**`ConnectionsService`** (singleton, `ConnectionsService.getInstance()`) holds one active
`DatabaseConnection` plus any number of data-source connections. Backends live in
`src/state/connections/`: `duckdb-wasm`, `duckdb-native` (Electron), `duckdb-over-http`, `md-wasm`
(MotherDuck). Everything downstream is written against the `DatabaseConnection` interface, so
features must not assume WASM.

### Projects, storage and routing

- A project is a workspace of files (`.md` pages, `.sql` queries, folders) and (in WASM) its own data
  tables, backed by per-project DuckDB files. The registry lives in a per-connection meta database
  (`projects.duckdb`, catalog `dash_projects`). See `docs/projects.md`.
- Catalogs are aliased via constants in `global-data.ts`: `dash` (state: the `workspace` table,
  `cache.*`, `refs.*`), `dash_data` (user tables, WASM only), `dash_projects`, `dash_temp`.
- **`StorageDuckAPI`** / `persistency/duckdb-storage.ts` writes one JSON value per table of the project's
  `dash` database (throttled, with a version-conflict check). The workspace store saves through it
  (`workspace/blob-backend.ts`); Electron's folder backend is planned. See `dev/workspace-files.md`.
- Routing is entirely client-side over the History API (`output: 'export'` cannot serve dynamic
  routes). `DashNavigator.instance()` in `src/state/routing/navigation.ts` is the only place that
  builds URLs; callers pass typed locations from the `DashLocations` factory. A file opens at its path,
  `/projects/<id>/workspace/Sales/Q3.md`. See `docs/routing.md`.

### Relations

- A query is a `.sql` file: `-- key: value` header lines (view setup) over its SQL
  (`workspace/relation-config.ts`). Each is registered as the macro `dash.refs.<file name>()`
  (`workspace/query-macros.ts`), which is how queries read each other (`FROM refs.my_query()`).
  `{{param}}` placeholders become typed parameters (`relations/sql/query-parameters.ts`).
- What a query or block shows is a `RelationState`, built from its file by `useRelationModel`
  (`components/relation/use-relation-model.ts`): config changes go back to the file, picks, runs and paging
  stay in `surfaces.state.ts`, keyed by the path or `page.md#name`.
- **`RelationEvents`** (`relations/event/relation-events.ts`) is the lifecycle bus: `CREATE`,
  `DELETE`, `RENAME`, `QUERY_RUN_FINISHED`, `UPDATE_SQL`, `UPDATE_PARAMS`, `UPDATE_SELECTION`.
  Downstream refresh of page blocks subscribes to it; relation updates go through
  `processRelationUpdateEvent`.
- A page is a `.md` file edited in the Plate-based page editor (`src/components/page-editor/`, format in
  `markdown.ts`): text, and `sql` blocks with their own query or taking a query file in with `-- input:`, in
  rows of columns. Blocks get no macro: a block's `refs.<name>()` calls to other blocks of the page are
  expanded into its query when it runs (`relations/sql/page-refs.ts`).
- Renaming or moving a file rewrites the links, inputs and `refs` calls pointing at it
  (`workspace/rewrite-references.ts`).
- Canvases are disabled: their code is kept but excluded from `tsconfig.json` until they return as files that
  work like pages.

### Notable config

- `next.config.mjs`: static export (`output: 'export'`), WASM enabled, `Cross-Origin-Embedder-Policy:
  require-corp` and `Cross-Origin-Opener-Policy: same-origin` (required for SharedArrayBuffer/DuckDB),
  and version/commit env vars injected at build time.
- `reactStrictMode: false` - intentional, avoids double-mount issues with DuckDB.
- Path alias: `@/*` → `./src/*`.
- Playwright (`test/`) runs two projects: `web` runs every spec in Chromium, `electron` runs only
  `*.shared.spec.ts` against the desktop app; `test/fixtures.ts` branches on `metadata.target`.
  Every spec is currently shared, so new ones should be too - write them against the fixtures
  (`import { test } from './fixtures'`, `async ({ app: page, appOrigin })`) unless a spec is
  genuinely runtime-specific.
  `workers: 1` is deliberate (OPFS contention). It runs its own dev server on port 3100 with its
  own `.next-e2e` dist dir, so it coexists with a regular `pnpm dev`; Electron's persistent state
  (DuckDB files + Chromium profile) is redirected into `.e2e-data/` and wiped by
  `test/global-setup.ts` each run. Vitest covers unit tests colocated in `src/`.

## Styling Guidelines

- **Never use custom/hardcoded colors** (e.g. `bg-white`, `text-gray-600`, `border-[#ededed]`, `#f7f9fb`)
- **Always use Tailwind CSS theme colors** that respect dark mode:
  - `bg-background` instead of `bg-white`
  - `text-foreground` instead of `text-black`
  - `text-muted-foreground` instead of `text-gray-500/600`
  - `border` instead of `border-gray-200` or `border-[#ededed]`
  - `bg-card` for card backgrounds
  - `bg-muted` for muted backgrounds

## Component Guidelines

- **Always prefer shadcn/ui components** over custom implementations
- Check `/src/components/ui/` for available components before creating new ones
- Common shadcn components: Button, Dialog, Dropdown, Tooltip, Toggle, Input, etc.
- **Never use the native `title` attribute for tooltips** - use the shadcn `Tooltip` component
  (`@/components/ui/tooltip`) instead

## Tech Stack

- Next.js 16 with App Router (static export), React 19, TypeScript
- Electron 43 + electron-builder for the desktop app
- Tailwind CSS + shadcn/ui (Radix UI)
- Zustand for state management
- DuckDB WASM in the browser, `@duckdb/node-api` natively in Electron
- @xyflow/react for canvases (disabled), Plate for pages (page editor), dnd-kit for sorting, Headless Tree for
  the sidebar file tree
- ECharts + Recharts for visualization
- Monaco Editor for SQL editing
- Vercel AI SDK for LLM integration (OpenAI, Ollama, WebLLM)
- Vitest (unit) + Playwright (e2e)
- pnpm for package management
