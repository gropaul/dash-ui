import React, {useRef} from "react";

interface ColumnHeadResizeHandleProps {
    currentWidth: number;
    updateColumnWidth: (width: number) => void;
}

export function ColumnHeadResizeHandle({currentWidth, updateColumnWidth}: ColumnHeadResizeHandleProps) {

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
            className="absolute right-0 top-0 h-full nodrag nopan cursor-col-resize w-2 flex justify-center items-center"
        >
            <div className="ml-0.5 h-3 w-1 border-l border-gray-700 dark:border-gray-700"/>
        </div>
    );
}