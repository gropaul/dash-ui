import {ReactNode} from "react";
import {NodeType} from "@/components/workflow/flow";
import {NodeResizer} from "@xyflow/react";
import {cn} from "@/lib/utils";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {ConnectionHoverState} from "@/components/workflow/models";

export interface NodeBodyProps {
    type: NodeType;
    children?: ReactNode;
    className?: string;
    selected: boolean;
    displayName?: string;
    connectionHover?: ConnectionHoverState | null;
}

interface BodyStyle {

}

const BodyStyles: Record<NodeType, BodyStyle> = {
    relationNode: {},
    chartNode: {},
    textNode: {},
    freeDrawNode: {},
};

const INVALID_MESSAGES: Record<string, string> = {
    cycle: 'Cannot create cycle',
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

export function NodeBody(props: NodeBodyProps) {
    const { type, children, connectionHover } = props;
    const title = props.displayName

    const headerHeight = title ?  '2rem' : '0rem';

    const isConnectionHovered = !!connectionHover;
    const isValidConnection = connectionHover?.isValid ?? true;
    const invalidMessage = connectionHover?.invalidReason ? INVALID_MESSAGES[connectionHover.invalidReason] : null;
    const shouldShake = connectionHover?.shake ?? false;

    return (
        <div
            className="flex flex-col w-full h-full relative"
            style={{
                animation: shouldShake ? 'shake 0.4s ease-in-out' : undefined,
            }}
        >
            <style>{shakeKeyframes}</style>
            {isConnectionHovered && !isValidConnection && invalidMessage && (
                <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
                    style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                    }}
                >
                    {invalidMessage}
                </div>
            )}
            <div
                className="flex-1 rounded-md overflow-visible w-full h-full"
                style={{
                    // padding: "0.5px", // Space for the gradient border
                    background: "#e4e4e4",
                    boxShadow: "var(--node-shadow)",
                    borderRadius: "0.5rem",
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
                />
                <div
                    className={`w-full h-full`}
                    style={{
                        backgroundColor: "#fafbfc",
                        borderRadius: "0.5rem",
                        height: "100%",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div
                        style={{
                            padding: '8px 8px',
                            display: title ? 'flex' : 'none',
                            alignItems: 'center',
                            gap: '10px',
                            borderBottom: '1px solid #e4e4e7'
                        }}
                    >
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            background: 'rgba(139,92,246,0.1)',
                            color: '#8b5cf6'
                        }}>
                            {defaultIconFactory('relation')}
                        </div>
                        <span style={{
                            fontWeight: 600,
                            textAlign: 'left',
                            fontSize: '13px',
                            color: '#18181b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                        }}>
                            {title}
                        </span>
                    </div>
                    <div className={cn("w-full",props.className)} style={{ height: `calc(100% - ${headerHeight})` }}>{children}</div>
                </div>
            </div>
        </div>
    );
}
