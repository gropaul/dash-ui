import {getBezierPath, useInternalNode, EdgeProps, getSimpleBezierPath} from '@xyflow/react';
import {getEdgeParams} from "@/components/workflow/edge/utils";

function SimpleFloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode,
    );

    const [edgePath] = getSimpleBezierPath({
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
            strokeWidth={8}
            markerEnd={markerEnd}
            style={style}
        />
    );
}

export default SimpleFloatingEdge;
