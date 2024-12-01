import {DataConnectionsState} from "@/state/connections.state";
import {DuckDBWasm, getDuckDBWasmConnection} from "@/state/connections/duckdb-wasm";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";
import {CONNECTION_ID_DUCKDB_WASM} from "@/platform/global-data";
import {getFileSystemOverDuckdbConnection} from "@/state/connections/file-system-over-duckdb";
import {DataConnection} from "@/model/connection";


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
        return this.connections[CONNECTION_ID_DUCKDB_WASM] as DuckDBWasm
    }

    updateConfig(connectionId: string, config: any) {
        const connection = this.connections[connectionId];
        if (!connection) {
            throw new Error(`Connection with id ${connectionId} not found`);
        }
        // update all the fields in the config
        connection.updateConfig(config);
    }

    async initialiseDefaultConnections(state: DataConnectionsState) {

        const duckDBLocal: DataConnection = getDuckDBLocalConnection();
        duckDBLocal.initialise().then( async () => {
            state.addConnection(duckDBLocal);
            state.loadAllDataSources(duckDBLocal.id);

            // is dependent on duckdb local
            const fileSystemOverDuckdb = await getFileSystemOverDuckdbConnection();
            fileSystemOverDuckdb.initialise().then(() => {
                state.addConnection(fileSystemOverDuckdb);
                state.loadAllDataSources(fileSystemOverDuckdb.id);
            });
        });

        const duckDBWasms = getDuckDBWasmConnection();
        duckDBWasms.initialise().then(() => {
            state.addConnection(duckDBWasms);
            state.loadAllDataSources(duckDBWasms.id);
        });



    }
}