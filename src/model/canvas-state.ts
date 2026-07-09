import {getRandomId} from "@/platform/id-utils";
import {Edge, Node, Viewport} from "@xyflow/react";
import {EntityBase} from "@/state/entities/entity-base";

export interface CanvasState extends EntityBase {
    id: string;
    viewState: CanvasViewState;
    nodes: Node[];
    edges: Edge[];
    viewport?: Viewport;
}

export interface CanvasViewState {
    displayName: string;
}

export function GetCanvasId(canvas: CanvasState): string {
    return `canvas-${canvas.id}`;
}

export function GetInitialCanvasState(): CanvasState {
    return {
        id: getRandomId(),
        viewState: {
            displayName: "New Canvas"
        },
        nodes: [],
        edges: [],
    };
}