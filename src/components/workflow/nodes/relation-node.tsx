import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Node, NodeProps, NodeResizer, Position} from '@xyflow/react';
import {RelationNodeBody} from "@/components/workflow/nodes/relation/relation-body";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {getInitialDataElement} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationViewAPIProps, RelationViewProps} from "@/components/relation/relation-view";
import {createEndUserRelationActions} from "@/state/relations/functions";
import {RelationToolbar} from "@/components/workflow/nodes/relation/relation-toolbar";
import {ConditionalHandles} from "@/components/workflow/nodes/relation/conditional-handles";
import {useHoverWithPadding} from "@/hooks/use-hover-with-padding";
import {FullscreenDialog} from "@/components/workflow/nodes/relation/fullscreen-dialog";
import {extractNodeRefs, diffEdges, createAutoEdge} from "@/state/relations/sql-ref-detection";
import {refreshDownstream} from "@/state/relations/refresh-queue";


import {
    ConnectionHoverState,
    DEFAULT_CODE_VIEW_HEIGHT,
    DEFAULT_NODE_HEIGHT,
    roundToGrid
} from "@/components/workflow/models";
import {WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE} from "@/platform/global-data";
import {RelationContextProvider} from "@/components/relation/chart/chart-export-context";
import {useWorkflowState} from "@/components/workflow/workflow-context";

const DEFAULT_RELATION_DATA = getInitialDataElement('table');

type RelationNodeProps = {
    relationData?: RelationBlockData;
    connectionHover?: ConnectionHoverState | null;
}

type RelationNodeType = Node<RelationNodeProps, 'relationNode'>;

export function RelationNode(props: NodeProps<RelationNodeType>) {
    const {setNodes, setEdges, getNodes, getEdges} = useWorkflowState();

    // Get relation data from node props, merge with defaults
    const rawData = props.data as RelationNodeProps;
    const data: RelationBlockData = rawData.relationData ?? DEFAULT_RELATION_DATA;

    // Update relation data in node, optionally with node-level updates (height, etc.)
    const updateNodeData = useCallback((
        dataUpdater: (prev: RelationBlockData) => RelationBlockData,
        nodeUpdater?: (node: Node) => Partial<Node>
    ) => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== props.id) return node;
                const currentData = (node.data as RelationNodeProps).relationData ?? DEFAULT_RELATION_DATA;
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

    // Simple data-only updater for compatibility with actions
    const setData = useCallback((updater: RelationBlockData | ((prev: RelationBlockData) => RelationBlockData)) => {
        updateNodeData(prev => typeof updater === 'function' ? updater(prev) : updater);
    }, [updateNodeData]);

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

    const [manager] = useState(() => new InputManager())
    const [closestHandle, setClosestHandle] = useState<Position | undefined>()
    const [isFullscreen, setIsFullscreen] = useState(false)
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

    const actions = useMemo(() => {
        const inputProps: RelationViewAPIProps = {
            relationState: data,
            updateRelation: setData,
            inputManager: manager,
            embedded: true
        }
        return createEndUserRelationActions(inputProps)
    }, [data, setData, manager])

    const handleToggleCode = useCallback(() => {
        const isCurrentlyShowing = data.viewState.codeFenceState.show;

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
            (prev) => ({
                ...prev,
                viewState: {
                    ...prev.viewState,
                    codeFenceState: {...prev.viewState.codeFenceState, show: !isCurrentlyShowing},
                },
            }),
            (node) => ({height: roundToGrid((node.height ?? DEFAULT_NODE_HEIGHT) + heightDelta)})
        );
    }, [data.viewState.codeFenceState.show, updateNodeData, lastCodeHeight]);

    const handleRun = useCallback(async () => {
        await actions.updateRelationDataWithBaseQuery(data.query.baseQuery);
        await refreshDownstream(props.id, {getNodes, getEdges, setNodes, setEdges});
    }, [actions, data.query.baseQuery, props.id, getNodes, getEdges, setNodes, setEdges]);

    const viewProps: RelationViewProps = {
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
                    viewType={data.viewState.selectedView}
                    displayName={data.viewState.displayName}
                    sql={data.query.baseQuery}
                    parameters={data.viewState.parametersState?.parameters}
                    lastExecutionMetaData={data.lastExecutionMetaData}
                    executionState={data.executionState}
                    onUpdateTitle={(newTitle) => {
                        setData(prev => ({
                            ...prev,
                            viewState: {
                                ...prev.viewState,
                                displayName: newTitle
                            }
                        }))
                    }}
                >
                    <RelationToolbar
                        isVisible={props.selected}
                        showCode={data.viewState.codeFenceState.show}
                        runState={data.executionState}
                        onRun={handleRun}
                        onStopRun={actions.cancelQuery}
                        onToggleCode={handleToggleCode}
                        viewProps={viewProps}
                        onViewChange={actions.setViewType}
                        onFullscreen={() => setIsFullscreen(true)}
                        onToggleHeader={() => {
                            updateNodeData(
                                (prev) => ({...prev, viewState: {...prev.viewState, showHeader: !prev.viewState.showHeader}}),
                            );
                        }}
                        showParams={data.viewState.parametersState?.panelState?.show ?? false}
                        onToggleParams={() => {
                            updateNodeData(
                                (prev) => {
                                    const currentShow = prev.viewState.parametersState?.panelState?.show ?? false;
                                    return {
                                        ...prev,
                                        viewState: {
                                            ...prev.viewState,
                                            parametersState: {
                                                ...prev.viewState.parametersState,
                                                panelState: {
                                                    ...prev.viewState.parametersState?.panelState,
                                                    show: !currentShow,
                                                },
                                            },
                                        },
                                    };
                                },
                            );
                        }}
                    />
                    <NodeResizer
                        lineClassName={'z-40'}
                        isVisible={props.selected}
                        minWidth={100}
                        minHeight={30}
                    />
                    <div className={'w-full h-full bg-background relative'}>
                        <RelationStateView
                            relationState={data}
                            updateRelation={setData}
                            inputManager={manager}
                            embedded={false}
                            configDisplayMode={'dialog'}
                            sqlEditorShowRunButton={false}
                            sqlEditorPanelMode={'overlay'}
                            height={'fit'}
                            codeFenceRef={codeFenceRef}
                        />
                    </div>
                    <ConditionalHandles type="source" isHovered={isHovered} closestHandle={closestHandle} isSelected={props.selected ?? false} />
                </RelationNodeBody>
                <FullscreenDialog
                    isOpen={isFullscreen}
                    onOpenChange={setIsFullscreen}
                    relationState={data}
                    updateRelation={setData}
                    inputManager={manager}
                />
            </RelationContextProvider>
        </div>
    );
}
