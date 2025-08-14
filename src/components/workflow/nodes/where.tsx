import {Handle, Node, NodeProps, Position} from '@xyflow/react';
import {NodeBody} from "@/components/workflow/nodes/base";


type NodeWhereProps = {
    expressionList?: string[];
}

type FromNode = Node<NodeWhereProps, 'WhereNode'>;


export function WhereNode(props: NodeProps<FromNode>) {

    return (
        <NodeBody type="whereNode">
            Filters
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </NodeBody>
    );

}