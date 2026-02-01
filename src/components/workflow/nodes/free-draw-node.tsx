import {NodeProps, NodeResizer} from '@xyflow/react';
import getStroke from 'perfect-freehand';
import {StrokePoint} from "@/components/workflow/models";

export interface FreeDrawNodeData {
    points: StrokePoint[];
    color: string;
    strokeSize: number;
}

function getSvgPathFromStroke(stroke: number[][]): string {
    if (!stroke.length) return '';

    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ['M', ...stroke[0], 'Q']
    );

    d.push('Z');
    return d.join(' ');
}

function getBounds(points: StrokePoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return {minX, minY, maxX, maxY};
}

export function FreeDrawNode({data, selected}: NodeProps) {
    const {points, color, strokeSize} = data as unknown as FreeDrawNodeData;

    if (!points || points.length === 0) return null;

    const bounds = getBounds(points);
    const padding = strokeSize + 4;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;

    // Normalize points relative to the node's top-left corner
    const normalizedPoints = points.map(([x, y, pressure]: StrokePoint) => [
        x - bounds.minX + padding,
        y - bounds.minY + padding,
        pressure,
    ]);

    const outlinePoints = getStroke(normalizedPoints, {
        size: strokeSize,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t) => t,
        start: {
            taper: 0,
            cap: true,
        },
        end: {
            taper: 0,
            cap: true,
        },
    });

    const pathData = getSvgPathFromStroke(outlinePoints);

    return (
        <div
            style={{
                position: 'relative',
                width,
                height,
                borderRadius: 4,
                backgroundColor: 'transparent',
                boxSizing: 'border-box',
            }}
        >
            <NodeResizer
                lineClassName={'z-40'}
                isVisible={selected}
                minWidth={100}
                minHeight={30}
            />
            <svg
                width={width}
                height={height}
                style={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    overflow: 'visible',
                    display: 'block',
                }}
            >
                <path
                    d={pathData}
                    fill={color}
                    stroke="none"
                />
            </svg>
        </div>
    );
}
