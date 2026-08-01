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

Deeper design docs live in `/docs` (`projects.md`, `routing.md`); `/src/state/docs.md` covers app
init order. Scratch planning notes are in `/dev`.

## Architecture

This is a data exploration tool built on **DuckDB** for SQL execution. Users connect data sources,
write SQL relations, and compose them on canvases and dashboards. It ships both as a browser app
(DuckDB WASM) and as an Electron desktop app (native DuckDB).

### Key layers

- **`src/app/`** - Next.js App Router, but only a single static shell (`page.tsx` + `not-found.tsx`).
  The root layout is a client component wrapping ThemeProvider → ResponsiveModeProvider →
  SettingsProvider → `AppGate`, plus TourDialog, Toaster and ConditionalAnalytics.
- **`src/state/`** - global state via **Zustand**, plus most of the non-UI logic:
  - Stores: `relations.state.ts` (relations, dashboards, canvases, editor folder tree),
    `relations-data.state.ts`, `projects.state.ts`, `database.state.ts`, `data-sources.state.ts`,
    `chat.state.ts`, `language-model.state.ts`, `gui.state.ts`, `init.state.ts`,
    `canvas-history.state.ts`, `monaco.state.ts`, `onboarding.state.ts`, `save-status.state.ts`,
    `rename-dialog.state.ts`.
  - Only some stores use `persist`: `relations` (into DuckDB, see below), `chat`, `database`, `gui`,
    `language-model` (stored obfuscated). The rest are in-memory.
  - Subfolders: `connections/` (backends), `persistency/` (storage seam), `routing/`, `projects/`,
    `relations/` (actions, events, SQL/DAG), `migrations/`, `entities/`, `init/`, `sources/`.
- **`src/components/`** - feature-organized React components: `canvas/`, `dashboard/`, `relation/`,
  `workbench/`, `layout/`, `chat/`, `catalog/`, `projects/`, `sources/`, `onboarding/`,
  `ui/` (shadcn).
- **`src/model/`** - TypeScript interfaces for domain objects (RelationState, RelationViewState,
  DashboardState, CanvasState, Project, ColumnStats, …).
- **`src/platform/`** - utilities and shared constants: `global-data.ts` (catalog names, limits,
  defaults - the single source of truth for magic values), `sql-utils`, `colors-utils`,
  `async-queue`, `electron.ts`, LRU cache, number/string/object utils.
- **`electron/`** - desktop shell: `main.js` (custom `app://` protocol serving `out/`),
  `preload.cjs` exposing `window.dashNative`, and `duckdb.cjs` (native DuckDB via `@duckdb/node-api`).

### Connections

**`ConnectionsService`** (singleton, `ConnectionsService.getInstance()`) holds one active
`DatabaseConnection` plus any number of data-source connections. Backends live in
`src/state/connections/`: `duckdb-wasm`, `duckdb-native` (Electron), `duckdb-over-http`, `md-wasm`
(MotherDuck). Everything downstream is written against the `DatabaseConnection` interface, so
features must not assume WASM.

### Projects, storage and routing

- A project is a workspace with its own relations, dashboards, canvases and (in WASM) its own data
  tables, backed by per-project DuckDB files. The registry lives in a per-connection meta database
  (`projects.duckdb`, catalog `dash_projects`). See `docs/projects.md`.
- Catalogs are aliased via constants in `global-data.ts`: `dash` (state: `main.relationState`,
  `cache.*`, `refs.*`), `dash_data` (user tables, WASM only), `dash_projects`, `dash_temp`.
- **`StorageDuckAPI`** / `persistency/duckdb-storage.ts` is the zustand `PersistStorage` that writes
  the relation state into the project's `dash` database (throttled, with a version-conflict check).
  `persistency/api.ts` swaps the store's storage from localStorage to DuckDB once a connection is up.
- Routing is entirely client-side over the History API (`output: 'export'` cannot serve dynamic
  routes). `DashNavigator.instance()` in `src/state/routing/navigation.ts` is the only place that
  builds URLs; callers pass typed locations from the `DashLocations` factory. See `docs/routing.md`.

### Relations

- Relations are SQL queries executed against the active connection. Each relation is registered as a
  macro `dash.refs.<sanitized_name>()` (`relations/sql/table-macros.ts`), which is how one relation
  references another (`FROM refs.my_query()`). `{{param}}` placeholders become typed parameters
  (`relations/sql/query-parameters.ts`).
- **`RelationEvents`** (`relations/event/relation-events.ts`) is the lifecycle bus: `CREATE`,
  `DELETE`, `RENAME`, `QUERY_RUN_FINISHED`, `UPDATE_SQL`, `UPDATE_PARAMS`, `UPDATE_SELECTION`.
  Macro registration and downstream refresh subscribe to it; wrap relation updates with
  `processRelationUpdateEvent` so all three contexts (standalone, canvas, dashboard) stay in sync.
- Canvases are @xyflow/react graphs; edges define a DAG and `relations/sql/dag-execution.ts` reruns
  downstream nodes in topological order. Dashboards are react-grid-layout widget grids.

### Notable config

- `next.config.mjs`: static export (`output: 'export'`), WASM enabled, `Cross-Origin-Embedder-Policy:
  require-corp` and `Cross-Origin-Opener-Policy: same-origin` (required for SharedArrayBuffer/DuckDB),
  and version/commit env vars injected at build time.
- `reactStrictMode: false` - intentional, avoids double-mount issues with DuckDB.
- Path alias: `@/*` → `./src/*`.
- Playwright (`test/`) runs two projects: `web` runs every spec in Chromium, `electron` runs only
  `*.shared.spec.ts` against the desktop app; `test/fixtures.ts` branches on `metadata.target`.
  `workers: 1` is deliberate (OPFS contention). Vitest covers unit tests colocated in `src/`.

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
- @xyflow/react for canvases, react-grid-layout for dashboards, dnd-kit for sorting
- ECharts + Recharts for visualization
- Monaco Editor for SQL editing
- Vercel AI SDK for LLM integration (OpenAI, Ollama, WebLLM)
- Vitest (unit) + Playwright (e2e)
- pnpm for package management
