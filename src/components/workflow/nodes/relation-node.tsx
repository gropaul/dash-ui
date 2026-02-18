import {useCallback, useMemo, useRef, useState} from "react";
import {Node, NodeProps, NodeResizer, Position, useReactFlow} from '@xyflow/react';
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

import {ConnectionHoverState} from "@/components/workflow/models";
import {WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE} from "@/platform/global-data";
import {RelationContextProvider} from "@/components/relation/chart/chart-export-context";
import {DEFAULT_CODE_VIEW_HEIGHT, GRID_SIZE, HEADER_HEIGHT} from "@/components/workflow/flow";

type NodeFromProps = {
    tableName?: string;
    connectionHover?: ConnectionHoverState | null;
}

type FromNode = Node<NodeFromProps, 'FromNode'>;

export function RelationNode(props: NodeProps<FromNode>) {
    const [data, setData] = useState<RelationBlockData>(getInitialDataElement('table'))
    const [manager] = useState(() => new InputManager())
    const [closestHandle, setClosestHandle] = useState<Position | undefined>()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [lastCodeHeight, setLastCodeHeight] = useState(DEFAULT_CODE_VIEW_HEIGHT)
    const codeFenceRef = useRef<HTMLDivElement>(null!);
    const {updateNode} = useReactFlow();

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
    }, [data])

    const handleToggleCode = useCallback(() => {
        const isCurrentlyShowing = data.viewState.codeFenceState.show;

        let heightDelta: number;
        if (isCurrentlyShowing) {
            // Closing: measure current height and store it
            const currentHeightRaw = codeFenceRef.current?.offsetHeight ?? lastCodeHeight;
            // make sure that this height fits the GRID layout, so we round it to the nearest multiple of GRID_SIZE
            const currentHeight = Math.round(currentHeightRaw / GRID_SIZE) * GRID_SIZE;

            setLastCodeHeight(currentHeight);
            heightDelta = -currentHeight;
        } else {
            // Opening: use the last stored height
            heightDelta = lastCodeHeight;
        }

        // Toggle the code fence state
        actions.toggleShowCode();

        // Update node height
        updateNode(props.id, (node) => ({
            ...node,
            height: (node.height ?? 256) + heightDelta,
        }));
    }, [data.viewState.codeFenceState.show, actions, updateNode, props.id, lastCodeHeight]);

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
                        onToggleCode={handleToggleCode}
                        viewProps={viewProps}
                        onViewChange={actions.setViewType}
                        onFullscreen={() => setIsFullscreen(true)}
                        onToggleHeader={() => {
                            const isCurrentlyShowing = data.viewState.showHeader;
                            const newShowHeader = !isCurrentlyShowing;

                            setData(prev => ({
                                ...prev,
                                viewState: {
                                    ...prev.viewState,
                                    showHeader: newShowHeader
                                }
                            }));

                            // Update node height
                            updateNode(props.id, (node) => ({
                                ...node,
                                height: (node.height ?? 256) + (newShowHeader ? HEADER_HEIGHT : -HEADER_HEIGHT),
                            }));
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
