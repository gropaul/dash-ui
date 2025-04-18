
import {RelationSource} from "@/model/relation";
import {DEFAULT_RELATION_VIEW_PATH} from "@/platform/global-data";
import {useRelationsState} from "@/state/relations.state";
import {DuckDBWasm} from "@/state/connections-database/duckdb-wasm";
import {FileFormat} from "@/state/connections-source/duckdb-helper";
import {WasmProvider} from "@/state/connections-database/duckdb-wasm/connection-provider";



export async function mountFilesOnWasm(files: File[], duckDBWasm: DuckDBWasm) {
    if (!duckDBWasm) {
        console.error('DuckDB WASM connection not found');
        throw new Error('DuckDB WASM connection not found');
    }

    await registerWasmFiles(duckDBWasm, files);
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
    } else if (fileExtension === 'duckdb') {
        return "database";
    } else if (fileExtension === 'db') {
        return "database";
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
    } else if (fileFormat === 'database') {
        query = `ATTACH '${fileName}' AS  "${table_name}"`;
    }
    return query;
}

export async function registerWasmFiles(duckDBWasm: DuckDBWasm, files: File[]): Promise<void> {
    // get the first file
    // read the file
    for (const file of files) {
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const {db, con} = await WasmProvider.getInstance().getCurrentWasm();
        await db.registerFileBuffer(file.name, fileBytes);
    }

}

