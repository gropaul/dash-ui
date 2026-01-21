import { getBezierPath, useInternalNode } from '@xyflow/react';
import {getEdgeParams} from "@/components/workflow/edge/utils";


export interface FloatingEdgeProps {
    id: string;
    source: string;
    target: string;
    markerEnd: string;
    style?: React.CSSProperties;
}

function SimpleFloatingEdge({ id, source, target, markerEnd, style }: FloatingEdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode,
    );

    const [edgePath] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    });

    return (
        <path
            id={id}
            className="react-flow__edge-path"
            d={edgePath}
            strokeWidth={5}
            markerEnd={markerEnd}
            style={style}
        />
    );
}

export default SimpleFloatingEdge;
