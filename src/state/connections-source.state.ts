import {createWithEqualityFn} from "zustand/traditional";
import {ConnectionsService} from "@/state/connections-service";
import {findNodeInTrees} from "@/components/basics/files/tree-utils";
import {DataConnectionConfig, DataSource, DataSourceConnection, DataSourceGroup} from "@/model/data-source-connection";
import {ConnectionStatus} from "@/model/database-connection";

export interface SourceConnectionZustand {
    connections: { [key: string]: DataSourceConnection };
    // default autoInitialise is true
    addSourceConnection: (connection: DataSourceConnection, initialise: boolean, loadDataSources: boolean) => Promise<ConnectionStatus | undefined>;
    initialiseSourceConnection: (connectionId: string) => Promise<ConnectionStatus>;
    getSourceConnection: (connectionId: string) => DataSourceConnection | undefined;
    getConnectionName: (connectionId: string) => string | undefined;

    getConnectionState: (connectionId: string) => ConnectionStatus;
    updateConnectionState: (connectionId: string) => Promise<ConnectionStatus>;
    setConnectionState: (connectionId: string, state: ConnectionStatus) => void;

    setConnectionError: (connectionId: string, error: any) => void;

    removeConnection: (connectionId: string) => void;

    updateConfig: (connectionId: string, config: DataConnectionConfig) => Promise<void>;
    loadAllDataSources: (connectionId: string) => Promise<{ [key: string]: DataSource }>;
    loadChildrenForDataSource: (connectionId: string, id_path: string[]) => Promise<DataSourceGroup | undefined>;

    refreshConnection: (connectionId: string) => Promise<void>;
}

export const useSourceConState = createWithEqualityFn<SourceConnectionZustand>((set, get) => ({
    connections: {},


    addSourceConnection: async (connection, initialise, loadDataSources) => {
        set((state) => ({
            connections: {...state.connections, [connection.id]: connection},
        }));
        ConnectionsService.getInstance().addSourceConnectionIfNotExists(connection);

        let state: ConnectionStatus | undefined = undefined;
        if (initialise) {
            state = await get().initialiseSourceConnection(connection.id);
        }

        if (loadDataSources) {
            await get().loadAllDataSources(connection.id);
        }

        return state;
    },

    initialiseSourceConnection: async (connectionId) => {
        const connection = ConnectionsService.getInstance().getSourceConnection(connectionId);
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


    getSourceConnection: (connectionId) => {
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

    refreshConnection: async (connectionId) => {
        // update connection state
        await get().updateConnectionState(connectionId);
        // load all data sources
        await get().loadAllDataSources(connectionId);
    },

    updateConfig: async (connectionId, config) => {
        ConnectionsService.getInstance().updateSourceConnectionConfig(connectionId, config);
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
        const newStatus = await ConnectionsService.getInstance().getSourceConnection(connectionId).checkConnectionState();
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
        ConnectionsService.getInstance().getSourceConnection(connectionId).connectionStatus = state;
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
        const connection = ConnectionsService.getInstance().getSourceConnection(connectionId);
        if (!connection) {
            get().setConnectionError(connectionId, new Error(`Connection with id ${connectionId} not found`));
        }

        let dataSources: {[key: string]: DataSource} = {};
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
        const connection = ConnectionsService.getInstance().getSourceConnection(connectionId);
        if (!connection) {
            get().setConnectionError(connectionId, new Error(`Connection with id ${connectionId} not found`));
        }
        // Fetch the new data sources
        let children: {[key: string]: DataSource} = {};
        try {
            children = await connection.loadChildrenForDataSource(id_path);
        } catch (e: any) {
            get().setConnectionError(connectionId, e);
        }

        const currentDataSources = connection.dataSources;
        const dataSourceToLoadChildrenFor = findNodeInTrees(Object.values(currentDataSources), id_path);

        if (!dataSourceToLoadChildrenFor) {
            get().setConnectionError(connectionId, new Error(`Data source with id path ${id_path} not found`));
            return undefined;
        } else {
            dataSourceToLoadChildrenFor.children = Object.values(children);
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
    }
}));
