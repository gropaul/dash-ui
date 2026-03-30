import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {Flow} from "@/components/canvas/flow";
import {ReactFlowProvider} from "@xyflow/react";


export interface WorkflowTabProps {
    canvasId: string;
}

export function CanvasTab(props: WorkflowTabProps) {

    const workflow = useRelationsState((state) => state.getCanvasState(props.canvasId), shallow);

    if (!workflow) {
        return <div>Workflow not found: {props.canvasId}</div>
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                {workflow.viewState.displayName}
            </div>
            <ReactFlowProvider>
                <Flow canvasId={props.canvasId} />
            </ReactFlowProvider>
        </div>
    )
}
