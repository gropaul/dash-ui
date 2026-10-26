import {it, vi} from 'vitest';

// next/font only works inside the Next build.
vi.mock('next/font/google', () => ({Sometype_Mono: () => ({className: ''})}));

// The stores import each other in a cycle; a state module importing a UI module pulls the projects store in
// before the relations store is done, which then fails at load ("Cannot access 'localStorage' before initialization").
it('loads the stores in the order the app does', async () => {
    await import("@/state/connections/duckdb-wasm/duckdb-wasm-provider");
    await import("@/components/layout/app-gate");
});
