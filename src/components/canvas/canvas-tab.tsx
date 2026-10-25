import {useCallback} from "react";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";


export interface WorkflowTabProps {
    canvasId: string;
}

export function CanvasTab(props: WorkflowTabProps) {
    const {canvasId} = props;

    const canvas = useRelationsState((state) => state.canvas[canvasId], shallow);

    // Canvases are disabled while project content moves to files; a node has no page of its own to open.
    const openRelation = useCallback(() => {
    }, []);

    if (!canvas) {
        return <div>Workflow not found: {canvasId}</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                {canvas.viewState.displayName}
            </div>
            <ReactFlowProvider>
                <Flow canvasId={canvasId} openFullscreen={openRelation}/>
            </ReactFlowProvider>
        </div>
    );
}
