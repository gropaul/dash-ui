import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";
import {useBlockFullscreen} from "@/components/page-editor/block-fullscreen";


export interface WorkflowTabProps {
    /** The canvas file's path. */
    path: string;
}

export function CanvasTab({path}: WorkflowTabProps) {
    const openFullscreen = useBlockFullscreen(s => s.open);

    return (
        <div className="w-full h-full flex flex-col">
            <ReactFlowProvider key={path}>
                <Flow canvasId={path} openFullscreen={openFullscreen}/>
            </ReactFlowProvider>
        </div>
    );
}
