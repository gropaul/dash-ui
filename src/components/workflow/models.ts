import {NodePaletteItem} from "@/components/workflow/flow-palette";

export const DEFAULT_NODE_SIZE = {width: 512, height: 512};
export const DEFAULT_CHART_SIZE = {width: 512, height: 512};
export const DEFAULT_TEXT_SIZE = {width: 128, height: 64};

export type CanvasSelectedTool = 'pointer' | 'create-node' | 'create-text' | 'drag-canvas' | 'free-draw';

export type DrawToolVariant = 'pen' | 'marker' | 'highlighter';

export interface ConnectionHoverState {
    nodeId: string;
    isValid: boolean;
    invalidReason?: 'cycle' | 'duplicate';
    shake?: boolean;
}

export interface CanvasStateBase {
    selectedTool: CanvasSelectedTool;
    connectionHover?: ConnectionHoverState | null;
    drawSettings: DrawSettings;
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
    opacity: number; // 0-1
    toolVariant: DrawToolVariant;
}

export interface DrawSettings {
    color: string;
    size: number;
    opacity: number;
    toolVariant: DrawToolVariant;
}

export const DEFAULT_DRAW_SETTINGS: DrawSettings = {
    color: '#000000',
    size: 8,
    opacity: 1,
    toolVariant: 'pen',
};

export const TOOL_VARIANT_PRESETS: Record<DrawToolVariant, Partial<DrawSettings>> = {
    pen: { size: 4, opacity: 1 },
    marker: { size: 12, opacity: 0.7 },
    highlighter: { size: 24, opacity: 0.3 },
};

export interface CanvasStateFreeDraw extends CanvasStateBase{
    selectedTool: 'free-draw';
    currentStroke?: Stroke;
}

export interface CanvasStateTextCreation extends CanvasStateBase {
    selectedTool: 'create-text';
}

export type CanvasState = CanvasStatePointer | CanvasStateDragCanvas | CanvasStateNodeCreation | CanvasStateFreeDraw | CanvasStateTextCreation;

export const INITIAL_CANVAS_STATE: CanvasState = {
    selectedTool: 'pointer',
    drawSettings: DEFAULT_DRAW_SETTINGS,
}
