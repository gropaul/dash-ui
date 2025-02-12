import { DuckDBOverHttpConfig } from "@/state/connections-database/duckdb-over-http";
import { DuckDBWasmConfig } from "@/state/connections-database/duckdb-wasm";

export type DatabaseConnectionType =
    | "duckdb-over-http"
    | "duckdb-wasm"
    | "duckdb-wasm-motherduck";

export type DatabaseConfigMap = {
    "duckdb-over-http": DuckDBOverHttpConfig;
    "duckdb-wasm": DuckDBWasmConfig;
    "duckdb-wasm-motherduck": DuckDBWasmConfig;
};

export interface DBConnectionSpec {
    type: DatabaseConnectionType;
    config: DatabaseConfigMap[DBConnectionSpec["type"]];
}

export function specToString(spec: DBConnectionSpec, withSecrets = false): string {
    const config = spec.config;
    switch (spec.type) {
        case "duckdb-over-http":
            return `Connected to DuckDB via ${config.url} ${withSecrets ? `(${config.authentication === "token" ? "Token: " + config.token : "No authentication"})` : ""}`;
        case "duckdb-wasm":
            return `DuckDB WASM: ${config.name}`;
        case "duckdb-wasm-motherduck":
            return `DuckDB WASM (Motherduck): ${config.name}`;
    }
}