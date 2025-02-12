import {TreeExplorer} from "@/components/basics/files/tree-explorer";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import React from "react";
import {useConnectionsState} from "@/state/connections.state";
import {RefreshCw} from "lucide-react";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DataConnection} from "@/model/connection";
import {Button} from "@/components/ui/button";

export interface ConnectionViewProps {
    connection: DataConnection;
}

export function ConnectionView(props: ConnectionViewProps) {

    const refreshConnection = useConnectionsState((state) => state.refreshConnection);
    const loadChildrenForDataSource = useConnectionsState((state) => state.loadChildrenForDataSource);

    async function onElementClick(connection_id: string, id_path: string[]) {
        ConnectionsService.getInstance().getConnection(connection_id).onDataSourceClick(id_path);
    }

    function getContextMenuFactory(connection_id: string) {
        return ConnectionsService.getInstance().getConnection(connection_id).dataSourceContextMenuFactory;
    }

    async function onElementLoadRequest(connection_id: string, id_path: string[]) {
        await loadChildrenForDataSource(connection_id, id_path);
    }

    async function handleRefresh() {
        await refreshConnection(props.connection.id);
    }


    return (
        <li className="px-4 pr-0 py-2 pt-0 text-primary text-s h-fit relative group">
            <div className="flex pr-3 items-center justify-between">
                <div className="flex items-center space-x-2 text-nowrap font-semibold">
                    <span>{props.connection.config.name}</span>
                    <ConnectionStateIcon connectionId={props.connection.id}/>
                </div>

                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant={'ghost'} size={'icon'} onClick={handleRefresh} className={'h-8 w-8'}>
                        <RefreshCw size={12}/>
                    </Button>
                </div>
            </div>
            <div className={'pr-4'}>
                <TreeExplorer
                    enableDnd={false}
                    tree={props.connection.dataSources}
                    iconFactory={defaultIconFactory}
                    contextMenuFactory={getContextMenuFactory(props.connection.id)}
                    onClick={(id_path) => onElementClick(props.connection.id, id_path)}
                    loadChildren={(id_path) => onElementLoadRequest(props.connection.id, id_path)}
                />
            </div>
        </li>
    );
}

interface ConnectionStateIconProps {
    connectionId: string;
}

function ConnectionStateIcon(props: ConnectionStateIconProps) {
    const connectionsState = useConnectionsState(state => state.getConnectionState(props.connectionId));
    const message = connectionsState.message;
    if (connectionsState.state === "connected") {
        return <span className="text-green-500">●</span>
    }

    if (connectionsState.state === "disconnected") {
        return <span className="text-gray-500">●</span>
    }

    if (connectionsState.state === "error") {
        return <span className="text-red-500" title={message}>●</span>
    }

    if (connectionsState.state === "connecting") {
        return <span className="text-blue-500">●</span>
    }
}
