'use client';

import {Analytics, type BeforeSendEvent} from "@vercel/analytics/next";
import {isDebugMode} from "@/components/settings/about-content";

function checkIsDev(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    const port = parseInt(window.location.port, 10);
    const isLocalhost = (hostname === 'localhost' || hostname === '127.0.0.1') && port >= 3000 && port <= 3003;
    const isVercelPreview = hostname.endsWith('.vercel.app');
    return isLocalhost || isVercelPreview;
}

export function ConditionalAnalytics() {
    const previewMode = isDebugMode();

    if ( checkIsDev()) return null;

    function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
        if (previewMode) {
            const url = new URL(event.url, window.location.origin);
            url.hostname = 'preview.' + url.hostname;
            return {...event, url: url.toString()};
        }
        return event;
    }

    return <Analytics mode="production" beforeSend={beforeSend}/>;
}
