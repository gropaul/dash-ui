import {getRandomId} from "@/platform/id-utils";
import {Edge, Node, Viewport} from "@xyflow/react";

export interface WorkflowState {
    id: string;
    viewState: WorkflowViewState;
    nodes: Node[];
    edges: Edge[];
    viewport?: Viewport;
}

export interface WorkflowViewState {
    displayName: string;
}

export function GetWorkflowId(workflow: WorkflowState): string {
    return `workflow-${workflow.id}`;
}

export function GetInitialWorkflowState(): WorkflowState {
    return {
        id: getRandomId(),
        viewState: {
            displayName: "New Workflow"
        },
        nodes: [],
        edges: [],
    };
}