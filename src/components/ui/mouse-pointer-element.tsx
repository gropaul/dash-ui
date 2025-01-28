import {useEffect, useState} from "react";

export interface MousePointerElementProps {
    children: React.ReactNode;
    className?: string;
    offset?: { x: number, y: number };
    z?: number;
}



export function MousePointerElement({children, className, offset, z = 100}: MousePointerElementProps) {

    const [mousePosition, setMousePosition] = useState({x: 0, y: 0});

    // get the mouse position
    useEffect(() => {
        function handleMouseMove(e: MouseEvent) {
            setMousePosition({x: e.clientX, y: e.clientY});
        }

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        }
    }, []);

    return (
        <div
            className={className}
            style={{
                zIndex: z,
                position: 'absolute',
                left: mousePosition.x + (offset?.x ?? 0),
                top: mousePosition.y + (offset?.y ?? 0),
                pointerEvents: 'none',
            }}
        >
            {children}
        </div>
    )
}