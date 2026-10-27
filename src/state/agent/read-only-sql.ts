import {ConnectionsService} from "@/state/connections/connections-service";

const quote = (sql: string) => `'${sql.replace(/'/g, "''")}'`;

/** Throws unless `sql` is a single statement that only reads: DuckDB serializes nothing but SELECT statements. */
export async function checkReading(sql: string) {
    const result = await ConnectionsService.getInstance().executeQuery(`SELECT json_serialize_sql(${quote(sql)})::VARCHAR`, true);
    const parsed = JSON.parse(String(result.rows[0][0]));
    if (parsed.error) {
        throw new Error(parsed.error_type === 'not implemented' ? 'Only reading statements (SELECT, DESCRIBE, SHOW, …) are allowed.' : parsed.error_message);
    }
    if (parsed.statements.length !== 1) throw new Error(`Send exactly one statement (got ${parsed.statements.length}).`);
}
