import {useState} from 'react';
import {useInternalNode, EdgeProps, getSmoothStepPath, getBezierPath, getStraightPath, useReactFlow, BaseEdge} from '@xyflow/react';
import {getEdgeParams} from "@/components/workflow/edge/utils";
import {
    ContextMenu,
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {Trash2} from "lucide-react";

export type EdgeStyle = 'smoothstep' | 'bezier' | 'straight';

export interface FloatingEdgeData extends Record<string, unknown> {
    snapToCenter?: boolean;
    edgeStyle?: EdgeStyle;
}

function FloatingEdge({id, source, target, markerEnd, style, selected, data, interactionWidth}: EdgeProps) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const {setEdges} = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const edgeData = data as FloatingEdgeData | undefined;
    const snapToCenter = edgeData?.snapToCenter ?? true;
    const edgeStyle = edgeData?.edgeStyle ?? 'smoothstep';
    const {sx, sy, tx, ty, sourcePos, targetPos} = getEdgeParams(sourceNode, targetNode, snapToCenter);

    const pathParams = {
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetPosition: targetPos,
        targetX: tx,
        targetY: ty,
    };

    let edgePath: string;
    switch (edgeStyle) {
        case 'bezier':
            [edgePath] = getBezierPath(pathParams);
            break;
        case 'straight':
            [edgePath] = getStraightPath(pathParams);
            break;
        case 'smoothstep':
        default:
            [edgePath] = getSmoothStepPath(pathParams);
            break;
    }

    const toggleSnapToCenter = () => {
        setEdges((edges) =>
            edges.map((edge) =>
                edge.id === id
                    ? {...edge, data: {...edge.data, snapToCenter: !snapToCenter}}
                    : edge
            )
        );
    };

    const setEdgeStyleValue = (style: EdgeStyle) => {
        setEdges((edges) =>
            edges.map((edge) =>
                edge.id === id
                    ? {...edge, data: {...edge.data, edgeStyle: style}}
                    : edge
            )
        );
    };

    const deleteEdge = () => {
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    const isActive = selected || isHovered;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <g
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <BaseEdge
                        id={id}
                        path={edgePath}
                        markerEnd={markerEnd}
                        interactionWidth={interactionWidth ?? 20}
                        style={{
                            ...style,
                            strokeWidth: isActive ? 2 : 1.5,
                            stroke: selected ? '#8b5cf6' : isHovered ? '#a78bfa' : (style?.stroke ?? '#b1b1b7'),
                            transition: 'stroke 0.15s, stroke-width 0.15s',
                        }}
                    />
                </g>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuSub>
                    <ContextMenuSubTrigger>Edge style</ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                        <ContextMenuRadioGroup value={edgeStyle} onValueChange={(v) => setEdgeStyleValue(v as EdgeStyle)}>
                            <ContextMenuRadioItem value="smoothstep">Smooth Step</ContextMenuRadioItem>
                            <ContextMenuRadioItem value="bezier">Bezier</ContextMenuRadioItem>
                            <ContextMenuRadioItem value="straight">Straight</ContextMenuRadioItem>
                        </ContextMenuRadioGroup>
                    </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuCheckboxItem
                    checked={snapToCenter}
                    onCheckedChange={toggleSnapToCenter}
                >
                    Snap to center
                </ContextMenuCheckboxItem>
                <ContextMenuSeparator/>
                <ContextMenuItem
                    onClick={deleteEdge}
                    className="text-red-600 focus:text-red-600"
                >
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Delete edge
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export default FloatingEdge;
