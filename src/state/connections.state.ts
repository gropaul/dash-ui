import {create} from "zustand";
import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {findNodeInTrees} from "@/components/basics/tree-explorer/tree-utils";
import {ConnectionStatus, DataConnection, DataConnectionConfig, DataSource} from "@/model/connection";

export interface DataConnectionsState {
    connections: { [key: string]: DataConnection };

    initialiseDefaultConnections: () => void;
    // default autoInitialise is true
    addConnection: (connection: DataConnection, initialise: boolean, loadDataSources: boolean) => Promise<ConnectionStatus | undefined>;
    initialiseConnection: (connectionId: string) => Promise<ConnectionStatus>;
    getConnection: (connectionId: string) => DataConnection | undefined;
    getConnectionName: (connectionId: string) => string | undefined;

    getConnectionState: (connectionId: string) => ConnectionStatus;
    updateConnectionState: (connectionId: string) => Promise<ConnectionStatus>;

    removeConnection: (connectionId: string) => void;

    updateConfig: (connectionId: string, config: DataConnectionConfig) => void;
    loadAllDataSources: (connectionId: string) => Promise<DataSource[]>;
    loadChildrenForDataSource: (connectionId: string, id_path: string[]) => Promise<DataSource[]>;
    executeQuery: (connectionId: string, query: string) => Promise<RelationData>;

    refreshConnection: (connectionId: string) => Promise<void>;

    getDuckDBWasmConnection: () => DuckDBWasm;
}

export const useConnectionsState = create<DataConnectionsState>((set, get) => ({
    connections: {},

    initialiseDefaultConnections: async () => {
        const state = get();
        return ConnectionsService.getInstance().initialiseDefaultConnections(state);
    },
    addConnection: async (connection, initialise , loadDataSources) => {
        set((state) => ({
            connections: {...state.connections, [connection.id]: connection},
        }));
        ConnectionsService.getInstance().addConnection(connection);

        let state: ConnectionStatus | undefined = undefined;
        if (initialise) {
            state =  await get().initialiseConnection(connection.id);
        }

        if (loadDataSources) {
            await get().loadAllDataSources(connection.id);
        }

        return state;
    },

    initialiseConnection: async (connectionId) => {
        const connection = ConnectionsService.getInstance().getConnection(connectionId);
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }
        const newStatus =  await connection.initialise();

        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...state.connections[connectionId],
                    connectionState: newStatus,
                },
            },
        }));

        return newStatus;
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

    refreshConnection: async (connectionId) => {
        // update connection state
        await get().updateConnectionState(connectionId);
        // load all data sources
        await get().loadAllDataSources(connectionId);
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

    getConnectionState: (connectionId) => {
        const connection = get().connections[connectionId];
        return connection.connectionStatus;
    },
    updateConnectionState: async (connectionId) => {
        const newStatus = await ConnectionsService.getInstance().getConnection(connectionId).checkConnectionState();
        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...state.connections[connectionId],
                    connectionState: newStatus,
                },
            },
        }));
        return newStatus;
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
