/**
 * Client-side navigation via the History API.
 *
 * Static export (`output: 'export'`) cannot serve arbitrary runtime dynamic
 * routes through Next's router (dynamic routes need build-time
 * generateStaticParams; runtime ids are unknowable). So the app is a single
 * static shell (`app/page.tsx`) and we route entirely on the client: push/replace
 * the URL with History and notify subscribers. Deep-load/refresh works because
 * the host serves index.html for unknown paths (vercel.json rewrite; the C++
 * extension file-server fallback).
 *
 * Real URLs + back/forward (popstate) + shareable links all work; we simply
 * don't rely on next/navigation for the dynamic segments.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

function emit(): void {
    listeners.forEach((l) => l());
}

export function navigate(path: string): void {
    if (typeof window === "undefined") return;
    if (path === currentPathname()) return;
    window.history.pushState({}, "", path);
    emit();
}

export function navigateReplace(path: string): void {
    if (typeof window === "undefined") return;
    window.history.replaceState({}, "", path);
    emit();
}

/** Subscribe to location changes (History push/replace + browser back/forward). */
export function subscribeLocation(listener: Listener): () => void {
    listeners.add(listener);
    if (typeof window !== "undefined") window.addEventListener("popstate", listener);
    return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("popstate", listener);
    };
}

/** The current pathname (client only; "/" during SSR/prerender). */
export function currentPathname(): string {
    return typeof window !== "undefined" ? window.location.pathname : "/";
}
