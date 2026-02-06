import { Column, DataSource } from "@/model/data-source-connection";


export function getTables(source: Column | DataSource): DataSource[] {
    const tables: DataSource[] = []
    for (const child of source.children || []) {
        tables.push(...getTables(child));
    }

    if (source.type === 'relation') {
        tables.push(source);
    }
    return tables;
}

import { useMemo, useState } from "react";
import { Node, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { NodeBody } from "@/components/workflow/nodes/base";
import { RelationBlockData } from "@/components/editor/tools/relation.tool";
import { InputManager } from "@/components/editor/inputs/input-manager";
import { getInitialDataElement } from "@/model/dashboard-state";
import { RelationStateView } from "@/components/relation/relation-state-view";
import { RelationViewAPIProps } from "@/components/relation/relation-view";
import { createEndUserRelationActions } from "@/state/relations/functions";
import {Toolbar} from "@/components/workflow/nodes/relation/toolbar";
import {ConditionalHandles} from "@/components/workflow/nodes/relation/conditional-handles";
import {useHoverWithPadding} from "@/hooks/use-hover-with-padding";
import {FullscreenDialog} from "@/components/workflow/nodes/relation/fullscreen-dialog";

import {ConnectionHoverState} from "@/components/workflow/models";
import {WORKFLOW_NODE_RELATION_HANDLE_MIN_ACTIVE_DISTANCE} from "@/platform/global-data";

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
    return (
        <div
            className="w-full h-full relative"
            ref={divRef}
            onMouseMove={handleMouseMove}
        >
            <NodeBody
                type="relationNode"
                className={''}
                selected={props.selected}
                displayName={data.viewState.displayName}
                connectionHover={props.data.connectionHover}
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
                <Toolbar
                    isVisible={props.selected}
                    showCode={data.viewState.codeFenceState.show}
                    onToggleCode={actions.toggleShowCode}
                    currentView={data.viewState.selectedView}
                    onViewChange={actions.setViewType}
                    onFullscreen={() => setIsFullscreen(true)}
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
                    />
                </div>
                <ConditionalHandles type="source" isHovered={isHovered} closestHandle={closestHandle} isSelected={props.selected ?? false} />
            </NodeBody>
            <FullscreenDialog
                isOpen={isFullscreen}
                onOpenChange={setIsFullscreen}
                relationState={data}
                updateRelation={setData}
                inputManager={manager}
            />
        </div>
    );
}
