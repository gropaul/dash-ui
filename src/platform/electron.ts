/**
 * Runtime detection of the Electron desktop shell (see `electron/main.js`).
 *
 * There's no preload script exposing `window.electron`, so we sniff two signals that hold in
 * both dev (`ELECTRON_START_URL=http://localhost:3000`) and packaged (`app://bundle/`) runs:
 * the "Electron" token Chromium adds to the user-agent, and our custom `app:` protocol.
 *
 * Callers that render conditionally on this must guard against hydration mismatch — the value
 * differs between the static prerender (always false) and the client. See `useIsElectron`.
 */
export function isElectron(): boolean {
    if (typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent)) return true;
    if (typeof window !== "undefined" && window.location.protocol === "app:") return true;
    return false;
}
