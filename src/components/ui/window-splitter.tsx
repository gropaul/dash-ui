import {Layout} from "@/model/relation-view-state";
import {useCallback, useEffect, useRef, useState} from "react";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {ContentWrapper} from "@/components/relation/relation-view";


export interface WindowSplitterProps {

    children: React.ReactNode,

    child_1_active: boolean,
    child_2_active: boolean,

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

        // Store initial mouse position and initial ratio
        initialMousePosRef.current = isHorizontal ? e.clientX : e.clientY;
        initialRatioRef.current = props.ratio;
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current || initialMousePosRef.current === null) return;

        const rect = containerRef.current.getBoundingClientRect();
        const currentMousePos = isHorizontal ? e.clientX : e.clientY;
        const delta = currentMousePos - initialMousePosRef.current;

        // Convert the delta to a ratio change based on container size
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

    const needHandle = props.child_1_active && props.child_2_active;

    const codePercentage = props.ratio * 100;

    const child1Style = {
        flex: `${codePercentage} 1 0%`,
    };

    const child2Style = {
        flex: `${100 - codePercentage} 1 0%`,
    };

    // needs exactly 2 children
    if (props.children === undefined || (props.children as any[]).length !== 2) {
        throw new Error("WindowSplitter requires exactly 2 children");
    }

    const children = props.children as any[];
    const child1 = children[0];
    const child2 = children[1];

    return (
        <div ref={containerRef} className={`w-full h-full flex ${flexDirection}`}>

            {/* Child 1 */}
            {props.child_1_active && (
                <div
                    className="relative overflow-hidden"
                    style={child1Style}
                >
                    {child1}
                </div>
            )}

            {/* Resize Handle */}
            {needHandle && (

                <div
                    className={`${isHorizontal ? 'w-px h-full' : 'h-px w-full'} relative`}
                    style={{zIndex: 50, cursor: isHorizontal ? 'col-resize' : 'row-resize'}}
                    onMouseDown={onMouseDown}
                >
                    {/* The visible 1px line */}
                    <div
                        className={`${isHorizontal ? 'h-full' : 'w-full'} border-b border-r border-gray-200 dark:border-gray-700`}></div>

                    {/* Invisible hit area (no visible whitespace or extra layout space) */}
                    <div
                        className="absolute"
                        style={{
                            top: isHorizontal ? '0' : '-5px',
                            left: isHorizontal ? '-5px' : '0',
                            width: isHorizontal ? '11px' : '100%',
                            height: isHorizontal ? '100%' : '11px',
                            background: 'transparent',
                            cursor: isHorizontal ? 'ew-resize' : 'ns-resize',
                            pointerEvents: 'all',
                        }}
                    ></div>
                </div>
            )}

            {/* Child 2 */}
            {props.child_2_active && (
                <div
                    className="relative overflow-hidden"
                    style={child2Style}
                >
                    {child2}
                </div>
            )}

        </div>
    )
}