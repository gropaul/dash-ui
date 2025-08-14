import {ReactNode} from "react";
import {NodeType} from "@/components/workflow/flow-view";

export interface NodeBodyProps {
    type: NodeType;
    children?: ReactNode;
}

interface BodyStyle {
    displayName: string;
}

const BodyStyles: Record<NodeType, BodyStyle> = {
    fromNode: { displayName: "Data Source" },
    whereNode: { displayName: "Filter" },
};

export function NodeBody(props: NodeBodyProps) {
    const { type, children } = props;
    const title = BodyStyles[type]?.displayName ?? "Node";

    // colors — feel free to swap shades
    const headerGradient =
        type === "fromNode"
            ? "linear-gradient(135deg, #ff9a8b, #ff6a88, #ff99ac)"
            : "linear-gradient(135deg, #6a11cb, #2575fc)";

    return (
        <div className="flex flex-col w-full h-full">
            <div
                className="flex-1 rounded-md overflow-hidden"
                style={{ 
                    padding: "2px", // Space for the gradient border
                    background: headerGradient,
                    boxShadow: "var(--node-shadow)"
                }}
            >
                <div 
                    style={{ 
                        backgroundColor: "#fafbfc",
                        borderRadius: "0.375rem", // Equivalent to rounded-md
                        height: "100%",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div
                        className="text-sm font-semibold py-2 px-4"
                        style={{
                            color: "#333",
                        }}
                    >
                        {title}
                    </div>
                    <div className="flex-1 p-2">{children}</div>
                </div>
            </div>
        </div>
    );
}
