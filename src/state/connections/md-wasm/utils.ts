import {MaterializedQueryResult, SpecialDuckDBValue} from "@motherduck/wasm-client";
import {RelationData} from "@/model/relation";
import {Column} from "@/model/data-source-connection";
import {duckDBTypeToValueType} from "@/model/value-type";


export function resultToRelationData(result: MaterializedQueryResult): RelationData {
    const duckDBRows = result.data.toRows();

    const rows = []
    for (const ddBRow of duckDBRows) {
        const rowJS: any[] = []
        for (const col of result.data.columnNames()) {
            let val = ddBRow[col];
            if (val instanceof SpecialDuckDBValue) {
                val = val.toJS();
            }
            rowJS.push(val);
        }
        rows.push(rowJS);
    }

    const columns: Column[] = []
    const numCols = result.data.columnCount
    for (let colIndex = 0; colIndex < numCols; colIndex++) {
        const colName = result.data.columnName(colIndex);
        const colType = duckDBTypeToValueType(result.data.columnType(colIndex).name);
        columns.push({
            name: colName,
            id: colName,
            type: colType
        });
    }

    return {
        columns: columns,
        rows: rows
    }

}