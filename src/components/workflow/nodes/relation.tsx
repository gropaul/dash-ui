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

import { useMemo, useState, useRef } from "react";
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

type NodeFromProps = {
    tableName?: string;
}

type FromNode = Node<NodeFromProps, 'FromNode'>;

export function RelationNode(props: NodeProps<FromNode>) {
    const [data, setData] = useState<RelationBlockData>(getInitialDataElement('table'))
    const [manager] = useState(() => new InputManager())
    const [closestHandle, setClosestHandle] = useState<Position>(Position.Top)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const [divRef, isHovered] = useHoverWithPadding<HTMLDivElement>(48);


    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const distances = {
            [Position.Top]: mouseY,
            [Position.Right]: rect.width - mouseX,
            [Position.Bottom]: rect.height - mouseY,
            [Position.Left]: mouseX,
        };

        const closest = Object.entries(distances).reduce((min, [pos, dist]) =>
            dist < distances[min] ? pos as Position : min
        , Position.Top);

        setClosestHandle(closest);
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
                <ConditionalHandles type="source" isHovered={isHovered} closestHandle={closestHandle} />
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
