export type ValueType = 'Integer' | 'Float' | 'String' | 'Boolean' | 'Timestamp' | 'Struct' | 'List' | 'Map' | 'Unknown';

export function duckDBTypeToValueType(duckDBType: string): ValueType {
    switch (duckDBType.toLowerCase()) {
        // Boolean Types
        case "boolean":
        case "bool":
        case "logical":
            return 'Boolean';

        // Integer Types
        case "tinyint":
        case "int1":
        case "smallint":
        case "int2":
        case "int4":
        case "int8":
        case "int16":
        case "int32":
        case "int64":

        case "short":
        case "integer":
        case "int":
        case "signed":
        case "bigint":
        case "long":
        case "hugeint":
        case "utinyint":
        case "usmallint":
        case "uinteger":
        case "ubigint":
        case "uhugeint":
            return 'Integer';

        // Floating-Point Types
        case "float":
        case "float4":
        case "real":
        case "double":
        case "float8":
        case "double precision":
        case "decimal":
        case "numeric":
            return 'Float';

        // Date and Time Types
        case "date":
        case "timestamp":
        case "datetime":
        case "timestamp with time zone":
        case "timestamptz":
            return 'Timestamp';

        // String Types
        case "time":
        case "varchar":
        case "char":
        case "bpchar":
        case "text":
        case "string":
        case "blob":
        case "bytea":
        case "binary":
        case "varbinary":
        case "uuid":
            return 'String';

        // JSON Type
        case "json":
            return 'Struct'; // JSON can be treated as a structured object.

        // List Type
        case "list":
            return 'List';

        // Map Type
        case "map":
            return 'Map';

        // Struct Type
        case "struct":
            return 'Struct';

        // Bitstring Type
        case "bit":
        case "bitstring":
            return 'String'; // Bitstrings can be represented as strings.

        // Interval Type
        case "interval":
            return 'String'; // Intervals can be represented as strings.

        // Unhandled Types
        default:
            console.warn(`Unhandled DuckDB type: ${duckDBType}`);
            return 'Unknown';
    }
}
