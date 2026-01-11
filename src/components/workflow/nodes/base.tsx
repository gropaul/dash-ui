import {ReactNode} from "react";
import {NodeType} from "@/components/workflow/flow-view";
import {NodeResizer} from "@xyflow/react";
import {cn} from "@/lib/utils";

export interface NodeBodyProps {
    type: NodeType;
    children?: ReactNode;
    className?: string;
    selected: boolean;
}

interface BodyStyle {
    displayName: string;
}

const BodyStyles: Record<NodeType, BodyStyle> = {
    relationNode: { displayName: "Data Source" },
};

export function NodeBody(props: NodeBodyProps) {
    const { type, children } = props;
    const title = BodyStyles[type]?.displayName ?? "Node";

    // colors — feel free to swap shades
    const headerGradient =
        type === "relationNode"
            ? "linear-gradient(135deg, #ff9a8b, #ff6a88, #ff99ac)"
            : "linear-gradient(135deg, #6a11cb, #2575fc)";

    return (
        <div className="flex flex-col w-full h-full">
            <div
                className="flex-1 rounded-md overflow-visible w-full h-full"
                style={{
                    padding: "1px", // Space for the gradient border
                    background: "#e4e4e4",
                    // boxShadow: "var(--node-shadow)"
                }}
            >
                <div
                    className={`w-full h-full`}
                    style={{ 
                        backgroundColor: "#fafbfc",
                        borderRadius: "0.375rem", // Equivalent to rounded-md
                        height: "100%",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div className={cn("flex-1 w-full h-full",props.className)}>{children}</div>
                </div>
            </div>
        </div>
    );
}
