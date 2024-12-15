import {useRelationsState} from "@/state/relations.state";
import {RelationViewContent} from "@/components/relation/relation-view-content";
import {RelationViewHeader} from "@/components/relation/relation-view-header";
import {shallow} from "zustand/shallow";
import {RelationViewQueryView} from "@/components/relation/relation-view-query-view";
import {useEffect, useRef, useState, useCallback} from "react";
import {LOADING_TIMER_OFFSET} from "@/platform/global-data";
import {TriangleAlert} from "lucide-react";
import {TaskExecutionState} from "@/model/relation-state";

export interface RelationViewProps {
    relationId: string;
}

export function RelationView(props: RelationViewProps) {
    const relationExists = useRelationsState(
        (state) => state.doesRelationExist(props.relationId),
        shallow
    );

    const queryState = useRelationsState(
        (state) => state.getRelation(props.relationId).executionState,
        shallow
    );

    const codeFenceState = useRelationsState(
        (state) => state.getRelation(props.relationId).viewState.codeFenceState,
        shallow
    );

    const updateRelationViewState = useRelationsState((state) => state.updateRelationViewState);

    const relationId = props.relationId;
    const [isLoading, setIsLoading] = useState(false);

    function setCodeFenceState(relationId: string, sizePercentage: number) {
        updateRelationViewState(relationId, {
            codeFenceState: {
                ...codeFenceState,
                sizePercentage: sizePercentage,
            }
        });
    }

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (queryState.state === "running") {
            timer = setTimeout(() => {
                setIsLoading(true);
            }, LOADING_TIMER_OFFSET);
        } else {
            setIsLoading(false);
            if (timer) {
                clearTimeout(timer);
            }
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [queryState]);

    if (!relationExists) {
        return (
            <div className="flex flex-col w-full h-full items-center justify-center">
                <div className="text-gray-500">
                    Relation {props.relationId} not found
                </div>
            </div>
        );
    }

    const hasError = queryState.state === "error";

    const flexDirection = codeFenceState.layout === "row" ? "flex-col" : "flex-row";
    const codePercentage = codeFenceState.show ? codeFenceState.sizePercentage * 100 : 0;

    const codeFenceStyle = {
        flex: `${codePercentage} 1 0%`,
    };

    const contentStyle = {
        flex: `${100 - codePercentage} 1 0%`,
    };

    // Resizing logic similar to column resizing
    const isHorizontal = flexDirection === "flex-row";
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const initialMousePosRef = useRef<number | null>(null);
    const initialRatioRef = useRef<number>(codeFenceState.sizePercentage);

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);

        // Store initial mouse position and initial ratio
        initialMousePosRef.current = isHorizontal ? e.clientX : e.clientY;
        initialRatioRef.current = codeFenceState.sizePercentage;
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

        setCodeFenceState(props.relationId, newRatio);
    }, [isDragging, isHorizontal, props.relationId, setCodeFenceState]);

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

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col p-0 m-0">
            {/* Header */}
            <RelationViewHeader relationId={relationId}/>

            {/* Content */}
            <div className={`flex-1 overflow-auto`}>
                {/* Main content */}
                <div className={`w-full h-full flex ${flexDirection}`}>
                    {/* Query View Section */}
                    <div
                        className="overflow-hidden"
                        style={codeFenceStyle}
                    >
                        <RelationViewQueryView relationId={relationId}/>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className={`${isHorizontal ? 'w-px h-full' : 'h-px w-full'} relative`}
                        style={{zIndex: 50, cursor: isHorizontal ? 'col-resize' : 'row-resize'}}
                        onMouseDown={onMouseDown}
                    >
                        {/* The visible 1px line */}
                        <div className={`${isHorizontal ? 'h-full' : 'w-full'} border-b border-r border-gray-200 dark:border-gray-700`}></div>

                        {/* Invisible hit area (no visible whitespace or extra layout space) */}
                        <div
                            className="absolute"
                            style={{
                                top: isHorizontal ? '0' : '-5px',
                                left: isHorizontal ? '-5px' : '0',
                                width: isHorizontal ? '11px' : '100%',
                                height: isHorizontal ? '100%' : '11px',
                                background: 'transparent',
                                cursor: isHorizontal ? 'col-resize' : 'row-resize',
                                pointerEvents: 'all',
                            }}
                        ></div>
                    </div>


                    {/* Content Section */}
                    <div
                        className="relative overflow-hidden"
                        style={contentStyle}
                    >
                        <ContentWrapper
                            hasError={hasError}
                            isLoading={isLoading}
                            relationId={relationId}
                            queryState={queryState}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export interface ContentWrapperProps {
    hasError: boolean;
    isLoading: boolean;
    relationId: string;
    queryState: TaskExecutionState;
}

export function ContentWrapper(props: ContentWrapperProps) {
    return (
        <>
            {props.hasError ? (
                <RelationViewError message={props.queryState.message}/>
            ) : (
                <RelationViewContent relationId={props.relationId}/>
            )}

            {props.isLoading && (
                <div
                    className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-70 z-10 flex items-center justify-center transition-opacity duration-200"
                >
                    Loading...
                </div>
            )}
        </>
    );
}

export function RelationViewError(props: { message?: string }) {
    return (
        <div className="flex flex-col items-start justify-center p-4">
            <div className="text-red-500 flex items-center gap-2">
                <TriangleAlert size={18}/> {props.message || "An error occurred"}
            </div>
        </div>
    );
}
