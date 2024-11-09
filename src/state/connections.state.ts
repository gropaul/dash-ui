import {create} from "zustand";
import {RelationData} from "@/model/relation";
import {TreeNode} from "@/components/basics/tree-explorer/tree-explorer";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {Column} from "@/model/column";
import {ColumnSorting} from "@/model/relation-view-state";

export type DBConnectionType = 'duckdb-wasm' | 'duckdb-over-http' | 'local-filesystem';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database';

export interface DataSourceElement extends TreeNode {
    type: DataSourceType;
    name: string;
    children: Column[];
}

export interface DataSourceGroup extends TreeNode {
    name: string;
    type: DataGroupType;
    children: DataSource[];
}

export type DataSource = DataSourceElement | DataSourceGroup;

export type DataConnectionState = 'connected' | 'disconnected' | 'connecting';

export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

export interface DataConnection {
    id: string;
    name: string;
    configuration: DataConnectionConfig

    type: DBConnectionType;
    dataSources: DataSource[]; // Add dataSources here

    executeQuery: (query: string) => Promise<RelationData>;
    loadDataSources: () => Promise<DataSource[]>;

    initialise: () => Promise<DataConnectionState>;
    getConnectionState: () => Promise<DataConnectionState>;

}

export interface DataConnectionsState {
    connections: { [key: string]: DataConnection };

    initialiseDefaultConnections: () => void;
    addConnection: (connection: DataConnection) => void;
    getConnection: (connectionId: string) => DataConnection | undefined;
    getConnectionName: (connectionId: string) => string | undefined;

    removeConnection: (connectionId: string) => void;

    updateDataSources: (connectionId: string) => Promise<DataSource[]>;
    executeQuery: (connectionId: string, query: string) => Promise<any>;

    getDuckDBWasmConnection: () => DuckDBWasm;
}

export const useConnectionsState = create<DataConnectionsState>((set, get) => ({
    connections: {},

    initialiseDefaultConnections: async () => {
        const state = get();
        return ConnectionsService.getInstance().initialiseDefaultConnections(state);
    },
    addConnection: (connection) => {
        set((state) => ({
            connections: {...state.connections, [connection.id]: connection},
        }));
        ConnectionsService.getInstance().addConnection(connection);
    },


    getConnection: (connectionId) => {
        return get().connections[connectionId];
    },

    getConnectionName: (connectionId: string) => {
        const connection = get().connections[connectionId];
        return connection ? connection.name : undefined;
    },

    removeConnection: (connectionId) =>
        set((state) => {
            const connections = {...state.connections};
            delete connections[connectionId];
            return {connections};
        }),

    executeQuery: async (connectionId, query) => {
        return ConnectionsService.getInstance().executeQuery(connectionId, query);
    },

    updateDataSources: async (connectionId) => {
        const connection = ConnectionsService.getInstance().getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }

        // Fetch the new data sources
        const dataSources = await connection.loadDataSources();

        // Update only the dataSources property within the specified connection
        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...connection,
                    dataSources, // Only update dataSources, keeping other methods intact
                },
            },
        }));

        return dataSources;
    },

    getDuckDBWasmConnection: () => {
        return ConnectionsService.getInstance().getDuckDBWasmConnection();
    },
}));
