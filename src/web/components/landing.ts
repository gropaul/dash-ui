import {canvasNodes} from "@/state/workspace/canvas-text";
import canvasText from "@web/components/landing.canvas?raw";

/** The landing canvas's path: its query nodes are kept under `Landing.canvas#<name>`. */
export const LANDING_CANVAS = 'Landing.canvas';

/** What the landing canvas's queries read: a week of Dutch train stops, by a short name. */
export const LANDING_SETUP = [
    `CREATE VIEW memory.main.trains AS SELECT * FROM 'https://raw.githubusercontent.com/gropaul/dash-ui/main/test/data/services-2025-38.parquet';`,
];

/** The box around the landing canvas's nodes, which the hero fills edge to edge. */
export const LANDING_BOUNDS = (() => {
    const nodes = canvasNodes(canvasText);
    const x = Math.min(...nodes.map(n => n.x));
    const y = Math.min(...nodes.map(n => n.y));
    return {
        x, y,
        width: Math.max(...nodes.map(n => n.x + (n.width ?? 0))) - x,
        height: Math.max(...nodes.map(n => n.y + (n.height ?? 0))) - y,
    };
})();
