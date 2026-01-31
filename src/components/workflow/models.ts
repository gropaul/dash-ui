import {NodeTypeItem} from "@/components/workflow/flow-palette";

export const DEFAULT_NODE_SIZE = {width: 512, height: 256};
export const DEFAULT_CHART_SIZE = {width: 512, height: 512};
export const DEFAULT_TEXT_SIZE = {width: 128, height: 64};

export type CanvasSelectedTool = 'pointer' | 'create-node' | 'drag-canvas';

export interface CanvasStateBase {
    selectedTool: CanvasSelectedTool;
}

export interface CanvasStatePointer {
    selectedTool: 'pointer';
}

export interface CanvasStateDragCanvas {
    selectedTool: 'drag-canvas';
}


export interface SizingState {
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
}

export interface CanvasStateNodeCreation {
    selectedTool: 'create-node';
    previewMousePosition?: { x: number; y: number };
    nodeAdded: NodeTypeItem;
    sizing?: SizingState;
}

export type CanvasState = CanvasStatePointer | CanvasStateDragCanvas | CanvasStateNodeCreation;

export const INITIAL_CANVAS_STATE: CanvasState = {
    selectedTool: 'pointer',
}
