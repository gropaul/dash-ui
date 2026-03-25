import {useState} from 'react';
import {
    BaseEdge,
    EdgeProps,
    getBezierPath,
    getSmoothStepPath,
    getStraightPath,
    useInternalNode,
    useReactFlow
} from '@xyflow/react';
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
import type {EdgeAnimationState} from "@/state/relations/refresh-queue";

export type EdgeStyle = 'smoothstep' | 'bezier' | 'straight';

export interface FloatingEdgeData extends Record<string, unknown> {
    snapToCenter?: boolean;
    edgeStyle?: EdgeStyle;
    animationState?: EdgeAnimationState;
}

function FloatingEdge({id, source, target, style, selected, data, interactionWidth}: EdgeProps) {
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
    const animationState = edgeData?.animationState;
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
    const isAnimated = !!animationState;

    const baseStroke = selected ? '#8b5cf6' : isHovered ? '#a78bfa' : (style?.stroke ?? '#b1b1b7');
    // Executing = fast dashes, Queued = slow dashes
    const animDuration = animationState === 'executing' ? '0.6s' : '1.5s';

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <g
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <defs>
                        <marker
                            id={`arrow-${id}`}
                            markerWidth="30"
                            markerHeight="30"
                            viewBox="-10 -10 20 20"
                            markerUnits="strokeWidth"
                            orient="auto-start-reverse"
                            refX="0"
                            refY="0"
                        >
                            <polyline
                                points="-5,-4 0,0 -5,4"
                                style={{stroke: baseStroke, strokeWidth: 1, fill: 'none'}}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </marker>
                    </defs>
                    <BaseEdge
                        id={id}
                        path={edgePath}
                        markerEnd={`url(#arrow-${id})`}
                        interactionWidth={interactionWidth ?? 20}
                        style={{
                            ...style,
                            strokeWidth: isActive ? 2 : 1.5,
                            stroke: isAnimated ? 'transparent' : baseStroke,
                            transition: isAnimated ? 'none' : 'stroke 0.15s, stroke-width 0.15s',
                        }}
                    />
                    {isAnimated && (
                        <path
                            d={edgePath}
                            fill="none"
                            stroke={baseStroke}
                            strokeWidth={1.5}
                            strokeDasharray="6 4"
                            strokeLinecap="round"
                            markerEnd={`url(#arrow-${id})`}
                        >
                            <animate
                                attributeName="stroke-dashoffset"
                                from="20"
                                to="0"
                                dur={animDuration}
                                repeatCount="indefinite"
                            />
                        </path>
                    )}
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
