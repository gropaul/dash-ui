import {useState} from "react";


import {Handle, Node, NodeProps, NodeResizer, NodeToolbar, Position} from '@xyflow/react';
import {NodeBody} from "@/components/workflow/nodes/base";
import {Column, DataSource} from "@/model/data-source-connection";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {getInitialDataElement} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {Button} from "@/components/ui/button";
import {AlignLeft, Code} from "lucide-react";


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
        <NodeBody type="relationNode" className={''} selected={props.selected}>
            <NodeToolbar isVisible={props.selected} position={Position.Left} align={'start'}>
                <Button
                    variant={'outline'}
                    size={'icon'}
                    className={'h-8 w-8'}
                >
                    <Code />
                </Button>
            </NodeToolbar>
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
            <Handle type="source" position={Position.Top} id="a" />
            <Handle type="source" position={Position.Right} id="b" />
            <Handle type="source" position={Position.Bottom} id="c" />
            <Handle type="source" position={Position.Left} id="d" />
        </NodeBody>
    );

}