import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DashboardContent} from "@/components/dashboard/dashboard-content";


export interface WorkflowTabProps {
    workflowId: string;
}

export function WorkflowTab(props: WorkflowTabProps) {

    const workflow = useRelationsState((state) => state.getWorkflowState(props.workflowId), shallow);

    if (!workflow) {
        return <div>Workflow not found: {props.workflowId}</div>
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                {workflow.viewState.displayName}
            </div>
        </div>
    )
}
