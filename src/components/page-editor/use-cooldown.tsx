'use client';

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";

/** Runs `apply` with the latest scheduled value once `delayMs` passes without a new one; `pending` is true in between. */
export function useCooldown<T>(apply: (value: T) => void, delayMs: number) {
    const [pending, setPending] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latest = useRef<{ value: T } | null>(null);
    const applyRef = useRef(apply);
    useLayoutEffect(() => {
        applyRef.current = apply;
    });

    const flush = useCallback(() => {
        clearTimeout(timer.current);
        const next = latest.current;
        latest.current = null;
        setPending(false);
        if (next) applyRef.current(next.value);
    }, []);

    const schedule = useCallback((value: T) => {
        latest.current = {value};
        setPending(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, delayMs);
    }, [delayMs, flush]);

    useEffect(() => () => clearTimeout(timer.current), []);

    return {schedule, flush, pending};
}

/** A loading bar along the top of a panel while an update for it is on its way; it keeps running through new changes. */
export function CooldownIndicator({pending}: { pending: boolean }) {
    if (!pending) return null;
    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
            <SlidingBar/>
        </div>
    );
}

function SlidingBar() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const animation = ref.current?.animate(
            [{transform: 'translateX(-100%)'}, {transform: 'translateX(300%)'}],
            {duration: 1200, iterations: Infinity, easing: 'ease-in-out'},
        );
        return () => animation?.cancel();
    }, []);
    return <div ref={ref} className="h-full w-1/3 bg-primary"/>;
}
