import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Node, NodeProps, NodeResizer, Position} from '@xyflow/react';
import {RelationNodeBody} from "@/components/canvas/nodes/relation/relation-body";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {RelationToolbar} from "@/components/canvas/nodes/relation/relation-toolbar";
import {ConditionalHandles} from "@/components/canvas/nodes/relation/conditional-handles";
import {useHoverWithPadding} from "@/hooks/use-hover-with-padding";
import {createAutoEdge, diffEdges, extractNodeRefs} from "@/components/canvas/logic/ref-detection";
import {refreshDownstream} from "@/state/relations/sql/dag-execution";


import {
    ConnectionHoverState,
    DEFAULT_CODE_VIEW_HEIGHT,
    DEFAULT_NODE_HEIGHT,
    roundToGrid
} from "@/components/canvas/logic/models";
import {WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE} from "@/platform/global-data";
import {RelationContextProvider} from "@/components/relation/chart/chart-export-context";
import {useCanvasState} from "@/components/canvas/canvas-context";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationState} from "@/model/relation-state";
import {getDefaultSessionState, RelationViewMode} from "@/model/relation-view-state";
import {onRelationEvent} from "@/state/relations/event/relation-events";

type RelationNodeProps = {
    relationData?: RelationState;
    connectionHover?: ConnectionHoverState | null;
}

type RelationNodeType = Node<RelationNodeProps, 'relationNode'>;

const VIEW_MODE: RelationViewMode = 'embedded';

function getRelationState(props: RelationNodeProps): RelationState {
    const maybeRelationData = props.relationData;
    if (!maybeRelationData) {
        return RelationActions.create();
    }
    return maybeRelationData;
}

export function RelationNode(props: NodeProps<RelationNodeType>) {
    const {openFullscreen, setNodes, setEdges, getNodes, getEdges} = useCanvasState();

    // Get relation data from node props, merge with defaults if missing (e.g. on first load)
    const data = getRelationState(props.data as RelationNodeProps);

    // Update relation data in node, optionally with node-level updates (height, etc.)
    const updateNodeData = useCallback((
        dataUpdater: (prev: RelationState) => RelationState,
        nodeUpdater?: (node: Node) => Partial<Node>
    ) => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== props.id) return node;
                const currentData = getRelationState(node.data as RelationNodeProps);
                return {
                    ...node,
                    ...(nodeUpdater?.(node) ?? {}),
                    data: {
                        ...node.data,
                        relationData: dataUpdater(currentData),
                    },
                };
            })
        );
    }, [setNodes, props.id]);

    // Refresh downstream nodes when this relation's query finishes
    useEffect(() => {
        return onRelationEvent(async () => {
            await refreshDownstream(props.id, {getNodes, getEdges, setNodes, setEdges});
        }, ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"], data.id);
    }, [props.id, getNodes, getEdges, setNodes, setEdges]);

    // Simple data-only updater for compatibility with actions
    const updateRelation = useCallback((updater: RelationState | ((prev: RelationState) => RelationState)) => {
        updateNodeData(prev => typeof updater === 'function' ? updater(prev) : updater);
    }, [updateNodeData]);

    const actions = useMemo(() => {
        const inputProps: RelationViewAPIProps = {
            mode: VIEW_MODE,
            relationState: data,
            updateRelation: updateRelation,
            embedded: true
        }
        return getRelationActions(inputProps)
    }, [data, updateRelation])

    // Auto-detect node_xxx() references in SQL and sync edges
    const sql = data.query.baseQuery;
    useEffect(() => {
        const refs = extractNodeRefs(sql);
        const currentEdges = getEdges();
        const currentNodes = getNodes();
        const {toAdd, toRemove} = diffEdges(props.id, refs, currentEdges, currentNodes);

        if (toAdd.length === 0 && toRemove.length === 0) return;

        setEdges((edges) => {
            let updated = edges;
            if (toRemove.length > 0) {
                const removeSet = new Set(toRemove);
                updated = updated.filter(e => !removeSet.has(e.id));
            }
            for (const {source, target} of toAdd) {
                // Avoid duplicates (edge may already exist from manual drag)
                if (!updated.some(e => e.source === source && e.target === target)) {
                    updated = [...updated, createAutoEdge(source, target)];
                }
            }
            return updated;
        });
    }, [sql, props.id, setEdges, getEdges, getNodes]);

    const [closestHandle, setClosestHandle] = useState<Position | undefined>()
    const [lastCodeHeight, setLastCodeHeight] = useState(DEFAULT_CODE_VIEW_HEIGHT)
    const codeFenceRef = useRef<HTMLDivElement>(null!);

    const [divRef, isHovered] = useHoverWithPadding<HTMLDivElement>(48);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const distances = {
            [Position.Top]: Math.sqrt((mouseX - centerX) ** 2 + mouseY ** 2),
            [Position.Right]: Math.sqrt((mouseX - rect.width) ** 2 + (mouseY - centerY) ** 2),
            [Position.Bottom]: Math.sqrt((mouseX - centerX) ** 2 + (mouseY - rect.height) ** 2),
            [Position.Left]: Math.sqrt(mouseX ** 2 + (mouseY - centerY) ** 2),
        };

        const closest = Object.entries(distances).reduce((min, [pos, dist]) =>
                dist < distances[min] ? pos as Position : min
            , Position.Top);

        if (distances[closest] > WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE) {
            setClosestHandle(undefined);
        } else {
            setClosestHandle(closest);
        }
    };

    const isCodeShowing = actions.getSessionState(VIEW_MODE).codeFenceState.show;

    const handleToggleCode = useCallback(() => {
        const isCurrentlyShowing = isCodeShowing;

        let heightDelta: number;
        if (isCurrentlyShowing) {
            // Closing: measure current height and store it
            const currentHeight = roundToGrid(codeFenceRef.current?.offsetHeight ?? lastCodeHeight);
            setLastCodeHeight(currentHeight);
            heightDelta = -currentHeight;
        } else {
            heightDelta = lastCodeHeight;
        }

        updateNodeData(
            (prev) => {
                const prevSession = prev.viewState.embeddedSessionState ?? getDefaultSessionState('embedded');
                return {
                    ...prev,
                    viewState: {
                        ...prev.viewState,
                        embeddedSessionState: {
                            ...prevSession,
                            codeFenceState: {...prevSession.codeFenceState, show: !isCurrentlyShowing},
                        },
                    },
                };
            },
            (node) => ({height: roundToGrid((node.height ?? DEFAULT_NODE_HEIGHT) + heightDelta)})
        );
    }, [isCodeShowing, updateNodeData, lastCodeHeight]);

    const handleRun = useCallback(async () => {
        await actions.updateRelationDataWithBaseQuery(data.query.baseQuery);
    }, [actions, data.query.baseQuery, props.id, getNodes, getEdges, setNodes, setEdges]);

    const viewProps: RelationViewProps = {
        mode: VIEW_MODE,
        relationState: data,
        ...actions
    }

    return (
        <div
            className="w-full h-full relative"
            ref={divRef}
            onMouseMove={handleMouseMove}
        >
            <RelationContextProvider>
                <RelationNodeBody
                    className={''}
                    selected={props.selected}
                    connectionHover={props.data.connectionHover}
                    showHeader={data.viewState.showHeader}
                    relationState={data}
                    viewType={data.viewState.selectedView}
                >
                    <RelationToolbar
                        isVisible={props.selected}
                        showCode={isCodeShowing}
                        runState={data.executionState}
                        onRun={handleRun}
                        onStopRun={actions.cancelQuery}
                        onToggleCode={handleToggleCode}
                        viewProps={viewProps}
                        onViewChange={(entry) => {
                            actions.updateRelationViewState({
                                selectedView: entry.viewType,
                            });
                        }}
                        onFullscreen={() => openFullscreen(props.id)}
                        onToggleHeader={viewProps.toggleShowHeader}
                        showParams={data.viewState.parametersState?.panelState?.show ?? false}
                        onToggleParams={
                            data.viewState.parametersState.parameters.length == 0 ?
                                undefined : actions.toggleShowParameters
                        }
                    />
                    <NodeResizer
                        lineClassName={'z-40'}
                        isVisible={props.selected}
                        minWidth={100}
                        minHeight={30}
                    />
                    <div className={'w-full h-full bg-background relative'}>
                        <RelationStateView
                            mode={VIEW_MODE}
                            relationState={data}
                            updateRelation={updateRelation}
                            embedded={false}
                            sqlEditorShowRunButton={false}
                            sqlEditorPanelMode={'overlay'}
                            height={'fit'}
                            codeFenceRef={codeFenceRef}
                        />
                    </div>
                    <ConditionalHandles type="source" isHovered={isHovered} closestHandle={closestHandle}
                                        isSelected={props.selected ?? false}/>
                </RelationNodeBody>
            </RelationContextProvider>
        </div>
    );
}
