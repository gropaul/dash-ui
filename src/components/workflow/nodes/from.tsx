import {useCallback, useState} from "react";


import {Handle, Node, NodeProps, Position} from '@xyflow/react';
import {NodeBody} from "@/components/workflow/nodes/base";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ConnectionsService} from "@/state/connections-service";
import {Column, DataSource} from "@/model/data-source-connection";


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

export function FromNode(props: NodeProps<FromNode>) {

    const [tableName, setTableName] = useState(props.data.tableName || '');

    const connection = ConnectionsService.getInstance().getSourceConnection(ConnectionsService.getInstance().getDatabaseConnection().id);
    const sources = Object.keys(connection.dataSources || {});

    const availableTables = sources.map((sourceId) => {
        const source = connection.dataSources[sourceId];
        return getTables(source).map((table) => ({
            name: table.id,
            label: table.name,
        }));
    }).flat();
    return (
        <NodeBody type="fromNode">
            <Select
                value={tableName}
                onValueChange={setTableName}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                    {availableTables.map((table) => (
                        <SelectItem key={table.name} value={table.name}>
                            {table.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Handle type="source" position={Position.Right} />
        </NodeBody>
    );

}