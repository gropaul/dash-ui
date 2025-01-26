import {DataConnectionsState} from "@/state/connections.state";
import {DuckDBWasm, getDuckDBWasmConnection} from "@/state/connections/duckdb-wasm";
import {getDuckDBLocalConnection} from "@/state/connections/duckdb-over-http";
import {CONNECTION_ID_DUCKDB_WASM, DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {getFileSystemOverDuckdbConnection} from "@/state/connections/file-system-over-duckdb";
import {DataConnection} from "@/model/connection";
import {getRandomId} from "@/platform/id-utils";
import {RelationSourceQuery} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";
import {removeSemicolon} from "@/platform/sql-utils";


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

    hasConnection(connectionId: string) {
        if (this.connections[connectionId]) {
            return true;
        } else {
            return false;
        }
    }

    addConnectionIfNotExists(connection: DataConnection) {
        if (!this.connections[connection.id]) {
            this.connections[connection.id] = connection;
        }
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

    async checkIfQueryIsExecutable(connectionId: string, sql: string) {

        const preparedSQL = removeSemicolon(sql)
        const explainQuery = `EXPLAIN ${preparedSQL}`

        try {
            const result = await this.executeQuery(connectionId, explainQuery);
            return true;
        } catch (e) {
            return false;
        }
    }

    async initialiseDefaultConnections(state: DataConnectionsState) {

        const duckDBLocal: DataConnection = getDuckDBLocalConnection();
        state.addConnection(duckDBLocal, true, true).then(async () => {

            // is dependent on duckdb local
            const fileSystemOverDuckdb = await getFileSystemOverDuckdbConnection();
            await state.addConnection(fileSystemOverDuckdb, true, true).then(() => {
            })

            // if there are no relations, create an example query
            if (Object.keys(useRelationsState.getState().relations).length === 0) {
                await this.showExampleQuery(duckDBLocal.id);
            }


        });

        // const duckDBWasm = getDuckDBWasmConnection();
        // await state.addConnection(duckDBWasm, true, true);
    }

    async showExampleQuery(connectionId: string) {
        // add example query
        const randomId = getRandomId();
        const baseQuery = `-- Directly query Parquet file in S3
SELECT
station_name,
count(*) AS num_services
FROM 's3://duckdb-blobs/train_services.parquet'
-- FROM train_services
GROUP BY ALL
ORDER BY num_services DESC
LIMIT 10;`;
        const source: RelationSourceQuery = {
            type: "query",
            baseQuery: baseQuery,
            id: randomId,
            name: "Train Station Services"
        }
        const showRelationFromSource = useRelationsState.getState().showRelationFromSource;
        showRelationFromSource(connectionId, source, DEFAULT_RELATION_VIEW_PATH);
    }
}