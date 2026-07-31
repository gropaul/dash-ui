// Electron environment detection.
//
// The Electron preload (electron/preload.cjs) exposes `window.dashNative`; the browser build
// never does. That presence is our single source of truth for "are we in the desktop app".

/** True when running inside the Dash Electron desktop app (the native DuckDB bridge is present). */
export function isElectron(): boolean {
    return typeof window !== "undefined" && window.dashNative !== undefined;
}
