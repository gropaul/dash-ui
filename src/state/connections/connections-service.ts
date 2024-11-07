import {DataConnection, DataConnectionsState, useConnectionsState} from "@/state/connections.state";
import {DUCKDB_WASM_ID, DuckDBWasm, getDuckDBWasmConnection} from "@/state/connections/duckdb-wasm";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";


export class ConnectionsService {
    // singleton instance
    private static instance: ConnectionsService;

    connections: { [key: string]: DataConnection };

    private constructor() {
        this.connections = {};
    }

    static getInstance(): ConnectionsService {
        if (!ConnectionsService.instance) {
            ConnectionsService.instance = new ConnectionsService();
        }
        return ConnectionsService.instance;
    }

    getConnection(connectionId: string) {
        return this.connections[connectionId];
    }

    addConnection(connection: DataConnection) {
        this.connections[connection.id] = connection;
    }

    async executeQuery(connectionId: string, query: string) {
        const connection = this.connections[connectionId];
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }
        return connection.executeQuery(query);
    }

    getDuckDBWasmConnection() {
        return this.connections[DUCKDB_WASM_ID] as DuckDBWasm
    }


    async initialiseDefaultConnections(state: DataConnectionsState) {

        const duckDBLocal: DataConnection = getDuckDBLocalConnection();
        duckDBLocal.initialise().then(() => {
            state.addConnection(duckDBLocal);
            state.updateDataSources(duckDBLocal.id);
        });

        const duckDBWasms = getDuckDBWasmConnection();
        duckDBWasms.initialise().then(() => {
            state.addConnection(duckDBWasms);
            state.updateDataSources(duckDBWasms.id);
        });
    }
}