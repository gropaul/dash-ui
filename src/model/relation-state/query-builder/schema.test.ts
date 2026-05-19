import path from 'path';
import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {duckDBTypeToValueType} from "@/model/value-type";
import {RelationData} from "@/model/relation";
import {Column} from "@/model/data-source-connection";

// Use the blocking Node API from duckdb-wasm
const DUCKDB_DIST = path.dirname(require.resolve('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs'));
const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs');

// Arrow type ID to DuckDB type name mapping
function arrowTypeToDuckDBType(field: any): string {
    const typeStr = String(field.type);
    if (typeStr.startsWith('Int')) return typeStr.includes('64') ? 'BIGINT' : 'INTEGER';
    if (typeStr.startsWith('Float') || typeStr.startsWith('Decimal')) return 'FLOAT';
    if (typeStr === 'Utf8') return 'VARCHAR';
    if (typeStr === 'Bool') return 'BOOLEAN';
    if (typeStr.startsWith('Timestamp')) return 'TIMESTAMP';
    return typeStr;
}

/** Convert an Arrow Table result to RelationData, mimicking the production DuckDBWasm path. */
function arrowToRelationData(arrowTable: any): RelationData {
    const columns: Column[] = arrowTable.schema.fields.map((f: any) => ({
        id: f.name,
        name: f.name,
        type: duckDBTypeToValueType(arrowTypeToDuckDBType(f)),
    }));
    const rows = arrowTable.toArray().map((row: any) => {
        const obj = row.toJSON();
        return arrowTable.schema.fields.map((f: any) => obj[f.name]);
    });
    return {columns, rows};
}

let db: any;
let conn: any;

/** Executes a query through the blocking duckdb-wasm Node API and returns RelationData. */
async function executeQuery(query: string): Promise<RelationData> {
    const result = conn.query(query);
    return arrowToRelationData(result);
}

// Mock ConnectionsService so getQuerySchema uses our local duckdb-wasm instance
vi.mock('@/state/connections/connections-service', () => ({
    ConnectionsService: {
        getInstance: () => ({
            executeQuery: (query: string, _readOnly: boolean) => executeQuery(query),
        }),
    },
}));

// Import after mock is set up
const {getQuerySchema} = await import('@/model/relation-state/query-builder/schema');

describe('getQuerySchema', () => {

    beforeAll(async () => {
        const bundle = {
            mvp: {mainModule: path.join(DUCKDB_DIST, 'duckdb-mvp.wasm'), mainWorker: null},
            eh: null,
        };
        db = await duckdb.createDuckDB(bundle, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
        await db.instantiate();
        conn = db.connect();
    });

    afterAll(() => {
        conn?.close();
    });

    it('should return the same column names and types as executing the query', async () => {
        const query = "SELECT 42 as int_col, 'hello' as str_col, true as bool_col";

        const fullResult = await executeQuery(query);
        const describeSchema = await getQuerySchema(query);

        expect(describeSchema.map(c => c.name)).toEqual(fullResult.columns.map(c => c.name));
        expect(describeSchema.map(c => c.type)).toEqual(fullResult.columns.map(c => c.type));
    });

    it('should handle timestamp and float types', async () => {
        const query = "SELECT TIMESTAMP '2024-01-01' as ts_col, 3.14::DOUBLE as float_col";

        const fullResult = await executeQuery(query);
        const describeSchema = await getQuerySchema(query);

        expect(describeSchema.map(c => c.name)).toEqual(fullResult.columns.map(c => c.name));
        expect(describeSchema.map(c => c.type)).toEqual(fullResult.columns.map(c => c.type));
    });

    it('should handle a query with many column types', async () => {
        const query = `SELECT
            1::TINYINT as tiny,
            2::SMALLINT as small,
            3::INTEGER as int_col,
            4::BIGINT as big,
            5.5::FLOAT as float_col,
            6.6::DOUBLE as double_col,
            'text'::VARCHAR as varchar_col,
            true as bool_col,
            TIMESTAMP '2024-06-15' as ts_col`;

        const fullResult = await executeQuery(query);
        const describeSchema = await getQuerySchema(query);

        expect(describeSchema).toHaveLength(fullResult.columns.length);
        for (let i = 0; i < describeSchema.length; i++) {
            expect(describeSchema[i].name).toBe(fullResult.columns[i].name);
            expect(describeSchema[i].type).toBe(fullResult.columns[i].type);
        }
    });

    it('should handle a subquery', async () => {
        const query = "SELECT * FROM (SELECT 1 as a, 2 as b, 3 as c) sub";

        const fullResult = await executeQuery(query);
        const describeSchema = await getQuerySchema(query);

        expect(describeSchema.map(c => c.name)).toEqual(fullResult.columns.map(c => c.name));
    });
});
