'use client';

import { useViewport } from '@xyflow/react';
import { HelperLine } from '../models';

interface HelperLinesProps {
    helperLines: HelperLine[];
}

export function HelperLines({ helperLines }: HelperLinesProps) {
    const viewport = useViewport();

    if (helperLines.length === 0) {
        return null;
    }

    return (
        <svg
            className="react-flow__helper-lines"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        >
            <g
                transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}
            >
                {helperLines.map((line, index) => (
                    <HelperLineRenderer key={`${line.axis}-${line.position}-${index}`} line={line} />
                ))}
            </g>
        </svg>
    );
}

interface HelperLineRendererProps {
    line: HelperLine;
}

function HelperLineRenderer({ line }: HelperLineRendererProps) {
    const { axis, position, start, end } = line;

    if (axis === 'horizontal') {
        // Horizontal line: fixed Y, extends along X
        return (
            <g>
                <line
                    className="helper-line"
                    x1={start}
                    y1={position}
                    x2={end}
                    y2={position}
                />
                <circle
                    className="helper-line-marker"
                    cx={start}
                    cy={position}
                    r={3}
                />
                <circle
                    className="helper-line-marker"
                    cx={end}
                    cy={position}
                    r={3}
                />
            </g>
        );
    } else {
        // Vertical line: fixed X, extends along Y
        return (
            <g>
                <line
                    className="helper-line"
                    x1={position}
                    y1={start}
                    x2={position}
                    y2={end}
                />
                <circle
                    className="helper-line-marker"
                    cx={position}
                    cy={start}
                    r={3}
                />
                <circle
                    className="helper-line-marker"
                    cx={position}
                    cy={end}
                    r={3}
                />
            </g>
        );
    }
}
