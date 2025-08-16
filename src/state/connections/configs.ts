import {DuckDBOverHttp, DuckDBOverHttpConfig} from "@/state/connections/duckdb-over-http";
import {DuckDBWasm, DuckDBWasmConfig} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL, DATABASE_CONNECTION_ID_DUCKDB_WASM} from "@/platform/global-data";

export type DatabaseConnectionType =
    | "duckdb-over-http"
    | "duckdb-wasm"
    | "duckdb-wasm-motherduck";

export function typeToLabel(type: DatabaseConnectionType): string {
    switch (type) {
        case "duckdb-over-http":
            return "DuckDB Over HTTP";
        case "duckdb-wasm":
            return "DuckDB WASM";
        case "duckdb-wasm-motherduck":
            return "DuckDB WASM (Motherduck)";
    }
}

export type DatabaseConfigMap = {
    "duckdb-over-http": DuckDBOverHttpConfig;
    "duckdb-wasm": DuckDBWasmConfig;
    "duckdb-wasm-motherduck": DuckDBWasmConfig;
};

export interface DBConnectionSpec {
    type: DatabaseConnectionType;
    config: DatabaseConfigMap[DatabaseConnectionType];
}

export function getDefaultSpec(type: DatabaseConnectionType = "duckdb-over-http"): DBConnectionSpec {
    switch (type) {
        case "duckdb-over-http":
            return {
                type: "duckdb-over-http",
                config: {
                    name: "DuckDB",
                    url: "http://localhost:4200",
                    authentication: "none",
                    token: "supersecrettoken",
                } ,
            } as any;
        case "duckdb-wasm":
            return {
                type: "duckdb-wasm",
                config: {
                    name: "DuckDB WASM",
                },
            };
        case "duckdb-wasm-motherduck":
            return {
                type: "duckdb-wasm-motherduck",
                config: {
                    name: "DuckDB WASM (Motherduck)",
                },
            }
    }
}

export function specToConnection(spec: DBConnectionSpec): DatabaseConnection {
    switch (spec.type) {
        case "duckdb-over-http":
            return new DuckDBOverHttp(spec.config as DuckDBOverHttpConfig, DATABASE_CONNECTION_ID_DUCKDB_LOCAL);
        case "duckdb-wasm":
            return new DuckDBWasm(spec.config as DuckDBWasmConfig, DATABASE_CONNECTION_ID_DUCKDB_WASM);
        case "duckdb-wasm-motherduck":
            throw new Error("Not implemented");
    }
}

export function connectionToString(connection: DatabaseConnection, withSecrets = false): string {
    return specToString(connectionToSpec(connection), withSecrets);
}

export function connectionToSpec(connection: DatabaseConnection): DBConnectionSpec {
    switch (connection.type) {
        case "duckdb-over-http":
            return {type: "duckdb-over-http", config: connection.config as DuckDBOverHttpConfig};
        case "duckdb-wasm":
            return {type: "duckdb-wasm", config: connection.config as DuckDBWasmConfig};
        case "duckdb-wasm-motherduck":
            throw new Error("Not implemented");
    }
}

export function specToString(spec: DBConnectionSpec, withSecrets = false): string {
    const config = spec.config;
    switch (spec.type) {
        case "duckdb-over-http":
            return `Connected to DuckDB via ${config.url} ${withSecrets ? `(${config.useToken ? "Token: " + config.token : "No authentication"})` : ""}`;
        case "duckdb-wasm":
            return `Connected to DuckDB WASM`
        case "duckdb-wasm-motherduck":
            return `Connected to DuckDB WASM (Motherduck)`
    }
}