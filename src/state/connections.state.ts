import {create} from "zustand";
import {RelationData} from "@/model/relation";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {ConnectionStatus, DataConnection, DataConnectionConfig, DataSource, DataSourceGroup} from "@/model/connection";

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
    setConnectionState: (connectionId: string, state: ConnectionStatus) => void;

    setConnectionError: (connectionId: string, error: any) => void;

    removeConnection: (connectionId: string) => void;

    updateConfig: (connectionId: string, config: DataConnectionConfig) => Promise<void>;
    loadAllDataSources: (connectionId: string) => Promise<DataSource[]>;
    loadChildrenForDataSource: (connectionId: string, id_path: string[]) => Promise<DataSourceGroup | undefined>;
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
    addConnection: async (connection, initialise, loadDataSources) => {
        set((state) => ({
            connections: {...state.connections, [connection.id]: connection},
        }));
        ConnectionsService.getInstance().addConnectionIfNotExists(connection);

        let state: ConnectionStatus | undefined = undefined;
        if (initialise) {
            state = await get().initialiseConnection(connection.id);
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
        const newStatus = await connection.initialise();

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

    updateConfig: async (connectionId, config) => {
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
        await get().refreshConnection(connectionId);
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
    setConnectionState: (connectionId, state) => {
        ConnectionsService.getInstance().getConnection(connectionId).connectionStatus = state;
        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...state.connections[connectionId],
                    connectionState: state,
                },
            },
        }));
    },
    setConnectionError(connectionId, error) {
        get().setConnectionState(connectionId, {state: 'error', message: error.message});
    },
    loadAllDataSources: async (connectionId) => {
        const connection = ConnectionsService.getInstance().getConnection(connectionId);
        if (!connection) {
            get().setConnectionError(connectionId, new Error(`Connection with id ${connectionId} not found`));
        }

        let dataSources: DataSource[] = [];
        try {
            dataSources = await connection.loadDataSources();
        } catch (e: any) {
            get().setConnectionError(connectionId, e);
        }
        // Fetch the new data sources
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
            get().setConnectionError(connectionId, new Error(`Connection with id ${connectionId} not found`));
        }
        // Fetch the new data sources
        let children: DataSource[] = [];
        try {
            children = await connection.loadChildrenForDataSource(id_path);
        } catch (e: any) {
            get().setConnectionError(connectionId, e);
        }

        const currentDataSources = connection.dataSources;
        const dataSourceToLoadChildrenFor = findNodeInTrees(currentDataSources, id_path);

        if (!dataSourceToLoadChildrenFor) {
            get().setConnectionError(connectionId, new Error(`Data source with id path ${id_path} not found`));
            return undefined;
        } else {
            dataSourceToLoadChildrenFor.children = children;
        }

        set((state) => ({
            connections: {
                ...state.connections,
                [connectionId]: {
                    ...connection,
                    dataSources: currentDataSources, // Only update dataSources, keeping other methods intact
                },
            },
        }));
        return dataSourceToLoadChildrenFor as DataSourceGroup;
    },
    getDuckDBWasmConnection: () => {
        return ConnectionsService.getInstance().getDuckDBWasmConnection();
    },
}));
