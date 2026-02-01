import {useViewport} from '@xyflow/react';
import getStroke from 'perfect-freehand';
import {Stroke, StrokePoint} from "@/components/workflow/models";

interface FreeDrawPreviewProps {
    currentStroke?: Stroke;
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

function renderStroke(stroke: Stroke, viewport: { x: number; y: number; zoom: number }): string {
    // Transform flow coordinates to screen coordinates
    const points = stroke.points.map(([x, y, pressure]: StrokePoint) => [
        x * viewport.zoom + viewport.x,
        y * viewport.zoom + viewport.y,
        pressure,
    ]);

    const outlinePoints = getStroke(points, {
        size: stroke.size * viewport.zoom,
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

    return getSvgPathFromStroke(outlinePoints);
}

export function FreeDrawPreview({currentStroke}: FreeDrawPreviewProps) {
    const viewport = useViewport();

    if (!currentStroke) return null;

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 100,
            }}
        >
            <path
                d={renderStroke(currentStroke, viewport)}
                fill={currentStroke.color}
                stroke="none"
            />
        </svg>
    );
}
