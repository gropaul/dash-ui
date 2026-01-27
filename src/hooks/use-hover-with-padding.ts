
import { useState, useEffect, useRef, RefObject } from 'react';

export function useHoverWithPadding<T extends HTMLElement>(padding: number = 32): [RefObject<T>, boolean] {
    const ref = useRef<T>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;

            const rect = ref.current.getBoundingClientRect();

            const isNear =
                e.clientX >= rect.left - padding &&
                e.clientX <= rect.right + padding &&
                e.clientY >= rect.top - padding &&
                e.clientY <= rect.bottom + padding;

            setIsHovered(prev => prev !== isNear ? isNear : prev);
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [padding]);

    return [ref, isHovered];
}