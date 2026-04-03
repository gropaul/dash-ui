'use client';

import {useEffect, useState} from "react";
import {Analytics, type BeforeSendEvent} from "@vercel/analytics/next";
import {getPreviewMode} from "@/components/settings/about-content";

function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    const port = parseInt(window.location.port, 10);
    return (hostname === 'localhost' || hostname === '127.0.0.1') && port >= 3000 && port <= 3003;
}

export function ConditionalAnalytics() {
    const [isDev, setIsDev] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        setIsDev(isLocalhost());
        setPreviewMode(getPreviewMode());
    }, []);

    if (isDev) return null;

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
