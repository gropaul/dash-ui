import {ConnectionsService} from "@/state/connections/connections-service";
import {Column} from "@/model/data-source-connection";
import {duckDBTypeToValueType} from "@/model/value-type";
import {removeSemicolon} from "@/platform/sql-utils";

/**
 * Returns the schema of a query using DuckDB's DESCRIBE statement.
 * This avoids executing the full query — only the schema is retrieved.
 */
export async function getQuerySchema(query: string): Promise<Column[]> {
    const perparedQuery = removeSemicolon(query);
    const describe = `DESCRIBE (${perparedQuery});`
    const result = await ConnectionsService.getInstance().executeQuery(
        describe,
        false
    );

    // DESCRIBE returns rows: [column_name, column_type, null, key, default, extra]
    return result.rows.map((row) => {
        const name = String(row[0]);
        const rawType = String(row[1]);
        return {
            id: name,
            name,
            type: duckDBTypeToValueType(rawType),
        } satisfies Column;
    });

}