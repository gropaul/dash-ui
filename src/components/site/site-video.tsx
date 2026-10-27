'use client';

import {useEffect, useRef} from "react";

/** A muted demo loop that plays only while it is on screen, so the page doesn't load every video at once. */
export function SiteVideo({src, label}: { src: string, label: string }) {
    const ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) void video.play().catch(() => undefined);
            else video.pause();
        }, {threshold: 0.4});
        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    return (
        <video ref={ref} src={src} aria-label={label} muted loop playsInline preload="metadata"
               className="aspect-video w-full rounded-2xl border bg-muted-background shadow-[var(--node-shadow)]"/>
    );
}
