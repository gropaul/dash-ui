import create from "zustand";
import { Relation } from "@/model/relation";
import {TreeNode} from "@/components/basics/tree-explorer/tree-explorer";
import {ConnectionsService} from "@/state/connections/connections-service";

export type DBConnectionType = 'duckdb-wasm' | 'duckdb-over-http' | 'local-filesystem';
export type DataSourceType = 'file' | 'relation';
export type DataGroupType = 'folder' | 'database';

export interface DataSourceElement extends TreeNode {
    type: DataSourceType;
    name: string;
    columnNames?: string[];
    columnTypes?: string[];
}

export interface DataSourceGroup extends TreeNode {
    name: string;
    type: DataGroupType;
    children: DataSource[];
}

export type DataSource = DataSourceElement | DataSourceGroup;

export interface DataConnection {
    id: string;
    name: string;
    type: DBConnectionType;
    executeQuery: (query: string) => Promise<Relation>;
    getDataSources: () => Promise<DataSource[]>;
    dataSources: DataSource[]; // Add dataSources here
}

interface DataConnectionsState {
    connections: { [key: string]: DataConnection };

    addConnection: (connection: DataConnection) => void;
    getConnection: (connectionId: string) => DataConnection | undefined;
    removeConnection: (connectionId: string) => void;

    updateDataSources: (connectionId: string) => Promise<DataSource[]>;
    executeQuery: (connectionId: string, query: string) => Promise<any>;
}

export const useConnectionsState = create<DataConnectionsState>((set, get) => ({
    connections: {},

    addConnection: (connection) => {
        set((state) => ({
            connections: { ...state.connections, [connection.id]: connection },
        }));
        ConnectionsService.getInstance().addConnection(connection);
    },


    getConnection: (connectionId) => {
        return get().connections[connectionId];
    },

    removeConnection: (connectionId) =>
        set((state) => {
            const connections = { ...state.connections };
            delete connections[connectionId];
            return { connections };
        }),

    executeQuery: async (connectionId, query) => {
        return ConnectionsService.getInstance().executeQuery(connectionId, query);
    },

    updateDataSources: async (connectionId) => {
        const connection = get().connections[connectionId];
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }

        // Fetch the new data sources
        const dataSources = await connection.getDataSources();

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
}));
