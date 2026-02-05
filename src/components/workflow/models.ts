import {NodePaletteItem} from "@/components/workflow/flow-palette";

export const DEFAULT_NODE_SIZE = {width: 512, height: 512};
export const DEFAULT_CHART_SIZE = {width: 512, height: 512};
export const DEFAULT_TEXT_SIZE = {width: 128, height: 64};

export type CanvasSelectedTool = 'pointer' | 'create-node' | 'drag-canvas' | 'free-draw';

export interface ConnectionHoverState {
    nodeId: string;
    isValid: boolean;
    invalidReason?: 'cycle' | 'duplicate';
    shake?: boolean;
}

export interface CanvasStateBase {
    selectedTool: CanvasSelectedTool;
    connectionHover?: ConnectionHoverState | null;
}

export interface CanvasStatePointer extends CanvasStateBase{
    selectedTool: 'pointer';
}

export interface CanvasStateDragCanvas extends CanvasStateBase {
    selectedTool: 'drag-canvas';
}


export interface SizingState {
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
}

export interface CanvasStateNodeCreation  extends CanvasStateBase {
    selectedTool: 'create-node';
    previewMousePosition?: { x: number; y: number };
    nodeAdded: NodePaletteItem;
    sizing?: SizingState;
}

export type StrokePoint = [number, number, number]; // x, y, pressure

export interface Stroke {
    id: string;
    points: StrokePoint[];
    color: string;
    size: number;
}

export interface CanvasStateFreeDraw extends CanvasStateBase{
    selectedTool: 'free-draw';
    currentStroke?: Stroke;
}

export type CanvasState = CanvasStatePointer | CanvasStateDragCanvas | CanvasStateNodeCreation | CanvasStateFreeDraw;

export const INITIAL_CANVAS_STATE: CanvasState = {
    selectedTool: 'pointer',
}
