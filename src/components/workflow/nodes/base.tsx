import {ReactNode} from "react";
import {NodeType} from "@/components/workflow/flow";
import {NodeResizer} from "@xyflow/react";
import {cn} from "@/lib/utils";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";

export interface NodeBodyProps {
    type: NodeType;
    children?: ReactNode;
    className?: string;
    selected: boolean;
    displayName?: string;
}

interface BodyStyle {

}

const BodyStyles: Record<NodeType, BodyStyle> = {
    relationNode: {},
    chartNode: {},
    textNode: {},
    freeDrawNode: {},
};

export function NodeBody(props: NodeBodyProps) {
    const { type, children } = props;
    const title = props.displayName

    const headerHeight = title ?  '2rem' : '0rem';

    return (
        <div className="flex flex-col w-full h-full">
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
