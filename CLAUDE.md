# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (webpack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm tsc          # TypeScript type-check (no emit)
pnpm test         # Vitest unit tests
pnpm test:ui      # Vitest with UI
pnpm test:e2e     # Playwright end-to-end tests
```

Implementation details and planning docs are in `/dev`.

## Architecture

This is a browser-based data exploration tool built on **DuckDB WASM** for in-browser SQL execution. Users connect data sources, write SQL relations, and visualize results on a canvas.

### Key layers

- **`src/app/`** — Next.js App Router. Root layout wraps everything in ThemeProvider, SettingsProvider, ResponsiveNodeProvider, ConditionalAnalytics.
- **`src/state/`** — All global state via **Zustand** stores with `persist` middleware:
  - `database.state.ts` — DB structure, table lookups, functions, keywords
  - `data-sources.state.ts` — External connection configs and status
  - `relations.state.ts` — Canvas nodes (relations/widgets) and their layout
  - `chat.state.ts` — LLM chat sessions and history
  - `language-model.state.ts` — LLM provider config (stored obfuscated)
  - `gui.state.ts` — Panel visibility and UI state
- **`src/components/`** — Feature-organized React components: `canvas/`, `chat/`, `dashboard/`, `editor/`, `relation/`, `workbench/`, `ui/` (shadcn).
- **`src/model/`** — TypeScript interfaces for domain objects (RelationState, RelationViewState, ColumnStats, etc.).
- **`src/platform/`** — Utilities: `sql-utils`, `colors-utils`, `async-queue`, LRU cache, number/string/object utils.

### Data flow

- **`ConnectionsService`** (singleton) manages all DuckDB connections — main DB plus external data sources.
- Relations are SQL queries executed against DuckDB. Widgets filter downstream relations by injecting `WHERE __row_idx IN (...)` into their macro.
- Downstream relations reference widget output via `FROM node_<name>()` table macros registered in DuckDB.
- **`RelationEvents`** notifies downstream relations when selections change.
- **`StorageDuckAPI`** / `duckdb-storage.ts` handles persistence to IndexedDB/localStorage.

### Notable config

- `next.config.mjs` exports as static files (`output: 'export'`), enables WASM, sets `Cross-Origin-Embedder-Policy: require-corp` (required for SharedArrayBuffer/DuckDB).
- `reactStrictMode: false` — intentional, avoids double-mount issues with DuckDB.
- Path alias: `@/*` → `./src/*`.

## Styling Guidelines

- **Never use custom/hardcoded colors** (e.g., `bg-white`, `text-gray-600`, `border-[#ededed]`, `#f7f9fb`)
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
- **Never use the native `title` attribute for tooltips** — use the shadcn `Tooltip` component (`@/components/ui/tooltip`) instead

## Tech Stack

- Next.js 16 with App Router, React 19, TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- Zustand for state management
- DuckDB WASM for in-browser SQL
- @xyflow/react for the canvas
- ECharts + Recharts for visualization
- Monaco Editor for SQL editing
- Vercel AI SDK for LLM integration (OpenAI, Ollama)
- Vitest (unit) + Playwright (e2e)
- pnpm for package management