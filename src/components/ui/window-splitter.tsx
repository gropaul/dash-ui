import {Layout} from "@/model/relation-view-state";
import {useCallback, useEffect, useRef, useState} from "react";

export interface WindowSplitterProps {
    children: React.ReactNode,
    child1Active?: boolean,
    child2Active?: boolean,
    ratio: number,
    layout: Layout,
    onChange: (ratio: number) => void,
}

export function WindowSplitter(props: WindowSplitterProps) {

    const flexDirection = props.layout === "row" ? "flex-col" : "flex-row";
    const isHorizontal = flexDirection === "flex-row";
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const initialMousePosRef = useRef<number | null>(null);
    const initialRatioRef = useRef<number>(props.ratio);

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        initialMousePosRef.current = isHorizontal ? e.clientX : e.clientY;
        initialRatioRef.current = props.ratio;
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current || initialMousePosRef.current === null) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentMousePos = isHorizontal ? e.clientX : e.clientY;
        const delta = currentMousePos - initialMousePosRef.current;

        const dimension = isHorizontal ? rect.width : rect.height;
        const ratioChange = delta / dimension;
        const newRatio = Math.min(Math.max(initialRatioRef.current + ratioChange, 0.1), 0.9);

        props.onChange(newRatio);
    }, [isDragging, isHorizontal]);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        initialMousePosRef.current = null;
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        } else {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);

    const codePercentage = props.ratio * 100;
    const child1Style = { flex: `${codePercentage} 1 0%`, alignSelf: 'stretch' };
    const child2Style = { flex: `${100 - codePercentage} 1 0%`, alignSelf: 'stretch' };

    if (props.children === undefined || (props.children as any[]).length !== 2) {
        throw new Error("WindowSplitter requires exactly 2 children but has " + (props.children as any[]).length);
    }

    const [child1, child2] = props.children as any[];
    const needHandle = (props.child1Active ?? true) && (props.child2Active ?? true);

    return (
        <div ref={containerRef} className={`bg-inherit w-full h-full flex ${flexDirection} items-stretch`}>
            {(props.child1Active ?? true) && (
                <div className="overflow-auto" style={child1Style}>{child1}</div>
            )}

            {needHandle && (
                <div
                    className={`${isHorizontal ? 'w-px h-full' : 'h-px w-full'} nodrag nopan relative bg-border`}
                    style={{ zIndex: 40, cursor: isHorizontal ? 'col-resize' : 'row-resize' }}
                    onMouseDown={onMouseDown}
                >
                    <div className={`${isHorizontal ? 'h-full' : 'w-full'}`}></div>
                    <div
                        className="absolute bg-transparent"
                        style={{
                            top: isHorizontal ? '0' : '-5px',
                            left: isHorizontal ? '-5px' : '0',
                            width: isHorizontal ? '11px' : '100%',
                            height: isHorizontal ? '100%' : '11px',
                            cursor: isHorizontal ? 'ew-resize' : 'ns-resize',
                            pointerEvents: 'all',
                        }}
                    ></div>
                </div>
            )}

            {(props.child2Active ?? true) && (
                <div className="overflow-auto bg-inherit" style={child2Style}>{child2}</div>
            )}
        </div>
    );
}
