import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {FileFormat} from "@/state/data-source/duckdb-helper";
import {WasmProvider} from "@/state/connections/duckdb-wasm/connection-provider";


export async function downloadOPFSFile(fileName: string): Promise<void> {

    // if fileName starts with opfs://, remove it
    if (fileName.startsWith('opfs://')) {
        fileName = fileName.substring(7);
    }

    console.log('downloading file: ', fileName);

    // Get the root OPFS directory
    const root = await navigator.storage.getDirectory();

    // Get a handle to the file
    const fileHandle = await root.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    // Read the file contents as a Blob (or ArrayBuffer/Text as needed)
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


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

// Extracts and validates a file name from a path or URL
export function sanitizeFileName(fileName: string): string {
    try {
        // If it's a URL, extract pathname
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(fileName)) {
            const url = new URL(fileName);
            fileName = url.pathname;
        }

        // Remove path segments — keep only the actual file name
        fileName = fileName.split('/').pop() ?? '';
        fileName = fileName.split('\\').pop() ?? '';

        // Reject empty names or just dots
        if (!fileName || /^[.]+$/.test(fileName)) {
            throw new Error('Invalid or empty file name');
        }

        // Validate characters (only alphanumerics, dash, underscore, dot)
        if (!/^[a-zA-Z0-9_.-]+$/.test(fileName)) {
            throw new Error('File name contains invalid characters');
        }

        // Reject dangerous names (optional: extend for OS-specific reserved names)
        if (fileName === '.' || fileName === '..') {
            throw new Error('Invalid file name: cannot be "." or ".."');
        }

        return fileName;
    } catch (e) {
        throw new Error(`Invalid file name: ${(e as Error).message}`);
    }
}


// The schemaName is the name of the table to be created in DuckDB
export async function getImportQuery(filePath: string, schemaName: string, fileFormat: FileFormat, readonly: boolean = false): Promise<string> {

    sanitizeFileName(filePath);
    sanitizeFileName(schemaName);

    let query = '';
    if (fileFormat === 'csv') {
        query = `CREATE TABLE "${schemaName}" AS SELECT * FROM read_csv_auto('${filePath}')`;
    } else if (fileFormat === 'parquet') {
        query = `CREATE TABLE "${schemaName}" AS SELECT * FROM read_parquet('${filePath}')`;
    } else if (fileFormat === 'json') {
        query = `CREATE TABLE "${schemaName}" AS SELECT * FROM read_json('${filePath}')`;
    } else if (fileFormat === 'xlsx') {
        query = `CREATE TABLE "${schemaName}" AS SELECT * FROM read_excel('${filePath}')`;
    } else if (fileFormat === 'database') {
        query = `ATTACH '${filePath}' AS  "${schemaName}"`;
        if (readonly) {
            query += ' (READ_ONLY);';
        }
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

