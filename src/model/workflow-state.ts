import {getRandomId} from "@/platform/id-utils";


export interface WorkflowState {
    id: string; // unique identifier for the workflow
    viewState: WorkflowViewState; // view state for the workflow
}

export interface WorkflowViewState {
    displayName: string; // display name for the workflow view
}

export function GetWorkflowId(workflow: WorkflowState): string {
    return `workflow-${workflow.id}`;
}

export function GetInitialWorkflowState(): WorkflowState {
    return {
        id: getRandomId(),
        viewState: {
            displayName: "New Workflow"
        }
    };
}