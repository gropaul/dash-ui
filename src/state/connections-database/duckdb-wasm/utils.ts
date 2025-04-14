
import {RelationSource} from "@/model/relation";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {useRelationsState} from "@/state/relations.state";
import {DuckDBWasm} from "@/state/connections-database/duckdb-wasm";
import {FileFormat} from "@/state/connections-source/duckdb-helper";
import {WasmProvider} from "@/state/connections-database/duckdb-wasm/connection-provider";



export async function importAndShowRelationsWithWASM(files: File[], duckDBWasm: DuckDBWasm) {
    if (!duckDBWasm) {
        console.error('DuckDB WASM connection not found');
        throw new Error('DuckDB WASM connection not found');
    }

    console.log('Importing files to DuckDB WASM:', files);
    const tableNames = await importFilesToDuckDBWasm(duckDBWasm, files);

    const showRelation = useRelationsState.getState().showRelationFromSource;

    for (const tableName of tableNames) {
        const source: RelationSource = {
            type: 'table',
            database: 'memory',
            schema: 'main',
            tableName: tableName,
        }
        showRelation(duckDBWasm.id, source, DEFAULT_RELATION_VIEW_PATH);
    }
}



export async function inferFileTableName(file: File): Promise<FileFormat | undefined> {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop();

    if (fileExtension === 'csv') {
        return "csv";
    } else if (fileExtension === 'parquet') {
        return "parquet";
    } else if (fileExtension === 'json') {
        return "json";
    } else if (fileExtension === 'xlsx') {
        return "xlsx";
    }
    return undefined;
}

export async function getImportQuery(fileName: string, table_name: string, fileFormat: FileFormat): Promise<string> {
    let query = '';
    if (fileFormat === 'csv') {
        query = `CREATE TABLE "${table_name}" AS SELECT * FROM read_csv_auto('${fileName}')`;
    } else if (fileFormat === 'parquet') {
        query = `CREATE TABLE "${table_name}" AS SELECT * FROM read_parquet('${fileName}')`;
    } else if (fileFormat === 'json') {
        query = `CREATE TABLE "${table_name}" AS SELECT * FROM read_json('${fileName}')`;
    } else if (fileFormat === 'xlsx') {
        query = `CREATE TABLE "${table_name}" AS SELECT * FROM read_excel('${fileName}')`;
    }
    return query;
}

export async function importFilesToDuckDBWasm(duckDBWasm: DuckDBWasm, files: File[]): Promise<string[]> {
    // get the first file
    // read the file
    const table_names = [];
    for (const file of files) {
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const {db, con} = await WasmProvider.getInstance().getWasm();
        db.registerFileBuffer(file.name, fileBytes);
        const fileFormat = await inferFileTableName(file);
        if (!fileFormat) {
            console.error('Unsupported file format:', file.name);
            continue;
        }
        const table_name = file.name.split('.').slice(0, -1).join('.');
        const query = await getImportQuery(file.name, table_name,  fileFormat);
        const result = await duckDBWasm.executeQuery(query);

        // Check if the result is valid
        table_names.push(table_name);
    }
    return table_names;
}

