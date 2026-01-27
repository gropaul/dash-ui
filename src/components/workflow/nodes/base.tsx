import {ReactNode} from "react";
import {NodeType} from "@/components/workflow/flow-view";
import {NodeResizer} from "@xyflow/react";
import {cn} from "@/lib/utils";

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
    relationNode: {

    },
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
                    boxShadow: "var(--node-shadow)"
                }}
            >
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
                        className=" whitespace-nowrap h-8 flex items-center justify-center border-b text-sm font-medium"
                        style={{
                            borderTopLeftRadius: "0.5rem",
                            borderTopRightRadius: "0.5rem",
                            display: title ? 'flex' : 'none',
                        }}
                    >
                        {title}
                    </div>
                    <div className={cn("w-full",props.className)} style={{ height: `calc(100% - ${headerHeight})` }}>{children}</div>
                </div>
            </div>
        </div>
    );
}
