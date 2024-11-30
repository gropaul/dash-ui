import {create} from "zustand";
import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {Column} from "@/model/column";
import {FormDefinition} from "@/components/basics/input/custom-form";
import {findNodeInTrees, TreeNode} from "@/components/basics/tree-explorer/tree-utils";

export type DBConnectionType = 'duckdb-wasm' | 'duckdb-over-http' | 'local-filesystem-over-duckdb';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database' | 'schema';

export interface DataSourceElement extends TreeNode {
    id: string;
    name: string;
    type: DataSourceType;
    children?: Column[];
}

export interface DataSourceGroup extends TreeNode {
    id: string;
    name: string;
    type: DataGroupType;
    children?: DataSource[];
}

export type DataSource = DataSourceElement | DataSourceGroup;

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';

export type DataConnectionConfig = { [key: string]: string | number | boolean | undefined };

export interface DataConnection {
    id: string;

    config: DataConnectionConfig
    configForm: FormDefinition;

    type: DBConnectionType;
    dataSources: DataSource[]; // Add dataSources here

    executeQuery: (query: string) => Promise<RelationData>;
    loadDataSources: () => Promise<DataSource[]>;

    initialise: () => Promise<ConnectionState>;
    getConnectionState: () => Promise<ConnectionState>;

    onDataSourceClick: (id_path: string[]) => void;
    loadChildrenForDataSource: (id_path: string[]) => Promise<DataSource[]>;
}

export interface DataConnectionsState {
    connections: { [key: string]: DataConnection };

    initialiseDefaultConnections: () => void;
    addConnection: (connection: DataConnection) => void;
    getConnection: (connectionId: string) => DataConnection | undefined;
    getConnectionName: (connectionId: string) => string | undefined;

    removeConnection: (connectionId: string) => void;

    updateConfig: (connectionId: string, config: DataConnectionConfig) => void;
    loadAllDataSources: (connectionId: string) => Promise<DataSource[]>;
    loadChildrenForDataSource: (connectionId: string, id_path: string[]) => Promise<DataSource[]>;
    executeQuery: (connectionId: string, query: string) => Promise<RelationData>;

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
        return connection ? connection.config.name as string : undefined;
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

    updateConfig: (connectionId, config) => {
        ConnectionsService.getInstance().updateConfig(connectionId, config);
        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...state.connections[connectionId],
                    config,
                },
            },
        }));
    },
    loadAllDataSources: async (connectionId) => {
        const connection = ConnectionsService.getInstance().getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }

        // Fetch the new data sources
        const dataSources = await connection.loadDataSources();
        connection.dataSources = dataSources;
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

    loadChildrenForDataSource: async (connectionId, id_path) => {
        const connection = ConnectionsService.getInstance().getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }
        // Fetch the new data sources
        const children = await connection.loadChildrenForDataSource(id_path);
        const currentDataSources = connection.dataSources;

        const dataSourceToLoadChildrenFor = findNodeInTrees(currentDataSources, id_path);

        if (!dataSourceToLoadChildrenFor) {
            throw new Error(`Data source with id path ${id_path} not found`);
        }

        console.log('children', children);

        dataSourceToLoadChildrenFor.children = children;
        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...connection,
                    dataSources: currentDataSources, // Only update dataSources, keeping other methods intact
                },
            },
        }));
        return children;
    },
    getDuckDBWasmConnection: () => {
        return ConnectionsService.getInstance().getDuckDBWasmConnection();
    },
}));
