import {useState} from "react";


import {Handle, Node, NodeProps, NodeResizer, Position} from '@xyflow/react';
import {NodeBody} from "@/components/workflow/nodes/base";
import {Column, DataSource} from "@/model/data-source-connection";
import {RelationBlockData, RelationComponent} from "@/components/editor/tools/relation.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {getInitialDataElement} from "@/model/dashboard-state";
import {DashboardDataView} from "@/components/dashboard/dashboard-data-view";
import {RelationStateView} from "@/components/relation/relation-state-view";


type NodeFromProps = {
    tableName?: string;
}

type FromNode = Node<NodeFromProps, 'FromNode'>;

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

export function RelationNode(props: NodeProps<FromNode>) {

    const [data, setData] = useState<RelationBlockData>(getInitialDataElement('table'))


    const manger = new InputManager()
    return (
        <NodeBody type="relationNode" className={'pt-1 '} selected={props.selected}>
            <NodeResizer
                isVisible={props.selected}
                minWidth={100}
                minHeight={30}
            />
            <div className={'w-full h-full bg-background relative'}>
                <RelationStateView
                    relationState={data}
                    updateRelation={setData}
                    inputManager={manger}
                />
            </div>
            <Handle type="source" position={Position.Right} />
            <Handle type="source" position={Position.Left} />
            <Handle type="source" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </NodeBody>
    );

}