import React, {useRef} from "react";
import {cn} from "@/lib/utils";

interface ColumnHeadResizeHandleProps {
    currentWidth: number;
    updateColumnWidth: (width: number) => void;
    isLastColumn: boolean;
}

export function ColumnHeadResizeHandle({currentWidth, updateColumnWidth, isLastColumn}: ColumnHeadResizeHandleProps) {

    const initialX = useRef<number | null>(null);
    const widthRef = useRef<number>(currentWidth);

    function onMouseMove(event: MouseEvent) {
        if (initialX.current !== null) {
            const deltaX = event.clientX - initialX.current;
            const newWidth = Math.max(widthRef.current + deltaX, 50); // Set a minimum width of 50px
            updateColumnWidth(newWidth);
        }
    }

    function onMouseUp() {
        initialX.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    }

    function onMouseDown(event: React.MouseEvent) {
        event.preventDefault(); // Prevent text selection
        initialX.current = event.clientX;
        widthRef.current = currentWidth;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    return (
        <div
            onMouseDown={onMouseDown}
            className={cn(
                isLastColumn ? '' : 'border-r',
                'absolute right-0 top-0 h-full nodrag nopan cursor-col-resize w-2 flex justify-center items-center'
            )}
        />
    );
}