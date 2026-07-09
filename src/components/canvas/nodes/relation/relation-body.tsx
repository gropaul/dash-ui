import {ReactNode} from "react";
import {NodeResizer} from "@xyflow/react";
import {cn} from "@/lib/utils";
import {ConnectionHoverState} from "@/components/canvas/logic/models";
import {RelationNodeHeader} from "@/components/canvas/nodes/relation/relation-header";
import {RelationViewType} from "@/model/relation-view-state";
import {RelationState} from "@/model/relation-state";

export interface NodeBodyProps {
    children?: ReactNode;
    className?: string;
    selected: boolean;
    connectionHover?: ConnectionHoverState | null;
    showHeader?: boolean;
    relationState: RelationState;
    viewType: RelationViewType;
}

const INVALID_MESSAGES: Record<string, string> = {
    cycle: 'Cannot create a cycle',
    duplicate: 'Connection already exists',
};

const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}
`;

export function RelationNodeBody(props: NodeBodyProps) {
    const {children, connectionHover, showHeader = true, viewType} = props;

    const isConnectionHovered = !!connectionHover;
    const isValidConnection = connectionHover?.isValid ?? true;
    const invalidMessage = connectionHover?.invalidReason ? INVALID_MESSAGES[connectionHover.invalidReason] : null;
    const shouldShake = connectionHover?.shake ?? false;

    const commonClassName = 'rounded-2xl'

    return (
        <div
            className="w-full h-full relative rounded-2xl"
            style={{
                animation: shouldShake ? 'shake 0.4s ease-in-out' : undefined,
            }}
        >
            <style>{shakeKeyframes}</style>
            {isConnectionHovered && !isValidConnection && invalidMessage && (
                <div
                    className={cn("absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap", commonClassName)}
                    style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: 500,
                    }}
                >
                    {invalidMessage}
                </div>
            )}
            <div
                className={cn('bg-muted-background overflow-visible w-full h-full', commonClassName)}
                style={{
                    boxShadow: "var(--node-shadow)",
                    borderColor: props.selected ? "#8b5cf6" : "transparent",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    outline: isConnectionHovered ? `2px solid ${isValidConnection ? '#8b5cf6' : '#ef4444'}` : 'none',
                    outlineOffset: '-1px',
                }}
            >
                <NodeResizer
                    lineClassName={'z-40'}
                    isVisible={props.selected}
                    minWidth={100}
                    minHeight={30}
                    onResize={(e) => e.sourceEvent.stopPropagation()}
                    onResizeStart={(e) => e.sourceEvent.stopPropagation()}
                    onResizeEnd={(e) => e.sourceEvent.stopPropagation()}
                />
                <div
                    className={cn('w-full h-full bg-background', commonClassName)}
                    style={{
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    {showHeader && (
                        <div className="flex-shrink-0">
                            <RelationNodeHeader
                                relationState={props.relationState}
                                viewType={viewType}
                            />
                        </div>
                    )}
                    <div className={cn("w-full flex-1 min-h-0", props.className)}>{children}</div>
                </div>
            </div>
        </div>
    );
}
