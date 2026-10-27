import {CanvasNodeText} from "@/state/workspace/canvas-text";

/** The landing canvas's path: its query nodes are kept under `Landing.canvas#<name>`. */
export const LANDING_CANVAS = 'Landing.canvas';

/** The box around the nodes, which the landing canvas fills edge to edge. */
export function canvasBounds(nodes: CanvasNodeText[]) {
    const x = Math.min(...nodes.map(n => n.x));
    const y = Math.min(...nodes.map(n => n.y));
    return {
        x, y,
        width: Math.max(...nodes.map(n => n.x + (n.width ?? 0))) - x,
        height: Math.max(...nodes.map(n => n.y + (n.height ?? 0))) - y,
    };
}
