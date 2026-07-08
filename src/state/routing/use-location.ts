import {useSyncExternalStore} from "react";
import {currentPathname, navigate, subscribeLocation} from "@/state/routing/navigation";

/** Reactive current pathname, updated on History push/replace + back/forward. */
export function useCurrentPath(): string {
    return useSyncExternalStore(subscribeLocation, currentPathname, () => "/");
}

/**
 * onClick handler for internal links: soft-navigate via History unless the user
 * is trying to open in a new tab (modifier / middle click), in which case the
 * real href is honored (host serves index.html on hard load).
 */
export function onNavClick(href: string) {
    return (e: React.MouseEvent) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
    };
}
