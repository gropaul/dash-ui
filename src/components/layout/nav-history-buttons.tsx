'use client';

import {useEffect, useState, useSyncExternalStore} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {isElectron} from "@/platform/electron";

// Minimal typing for the parts of the Navigation API we use — TS 5.7's lib.dom doesn't ship it
// yet. It's a Chromium-only web API, but we render this only in Electron (always Chromium), so
// `window.navigation` is guaranteed present. See https://developer.mozilla.org/docs/Web/API/Navigation
interface NavigationApi extends EventTarget {
    readonly canGoBack: boolean;
    readonly canGoForward: boolean;
    back(): void;
    forward(): void;
}

declare global {
    interface Window {
        readonly navigation?: NavigationApi;
    }
}

// The Navigation API tracks history position for us (including our router's pushState entries)
// and fires `currententrychange` whenever it moves — no manual index bookkeeping needed.
function subscribeNavigation(onChange: () => void): () => void {
    const nav = typeof window !== "undefined" ? window.navigation : undefined;
    if (!nav) return () => {};
    nav.addEventListener("currententrychange", onChange);
    return () => nav.removeEventListener("currententrychange", onChange);
}

const getCanGoBack = (): boolean => (typeof window !== "undefined" && window.navigation?.canGoBack) || false;
const getCanGoForward = (): boolean => (typeof window !== "undefined" && window.navigation?.canGoForward) || false;

/**
 * Back/forward navigation for the Electron shell, which has no browser chrome to provide it.
 * Renders nothing in the browser — the browser's own buttons already cover this. Each arrow
 * disables itself when there's no history entry to move to, read straight from the built-in
 * Navigation API rather than tracked by hand.
 */
export function NavHistoryButtons() {
    // isElectron() differs between the static prerender (false) and the client, so reveal only
    // after mount to keep the first client render matching the server and avoid a hydration mismatch.
    const [electron, setElectron] = useState(false);
    useEffect(() => setElectron(isElectron()), []);

    const canGoBack = useSyncExternalStore(subscribeNavigation, getCanGoBack, () => false);
    const canGoForward = useSyncExternalStore(subscribeNavigation, getCanGoForward, () => false);

    if (!electron) return null;

    return (
        <div className="flex items-center">
            <TooltipWrapper message="Back">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-6"
                    aria-label="Go back"
                    disabled={!canGoBack}
                    onClick={() => window.navigation?.back()}
                >
                    <ChevronLeft/>
                </Button>
            </TooltipWrapper>
            <TooltipWrapper message="Forward">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-6"
                    aria-label="Go forward"
                    disabled={!canGoForward}
                    onClick={() => window.navigation?.forward()}
                >
                    <ChevronRight/>
                </Button>
            </TooltipWrapper>
        </div>
    );
}
