import {ConnectionsService} from "@/state/connections/connections-service";
import {CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB} from "@/platform/global-data";


export type DirectoryItemType = 'file' | 'directory';

export interface DirectoryItem {
    name: string;
    // the absolute path of the item
    path: string;
    type: DirectoryItemType;
    lastModified: Date;
}

export function getDelimiter(absPath: string): string {
    // Detect Windows paths
    if (/^[a-zA-Z]:\\/.test(absPath) || absPath.startsWith('\\\\')) {
        return '\\';
    }
    // Assume Unix paths otherwise
    if (absPath.startsWith('/')) {
        return '/';
    }

    throw new Error(`Unknown root element in path: ${absPath}`);
}

export function normalizePath(absPath: string): string {
    const delimiter = getDelimiter(absPath);
    const pattern = new RegExp(`[${delimiter}]{2,}`, 'g'); // Match multiple delimiters
    return absPath.replace(pattern, delimiter); // Replace with a single delimiter
}

export function splitPath(absPath: string): string[] {
    const delimiter = getDelimiter(absPath);
    const normalizedPath = normalizePath(absPath);

    // Split and remove empty segments caused by leading/trailing delimiters
    return normalizedPath.split(delimiter).filter(Boolean);
}

export function concatPaths(absPath: string, pathToAppend: string): string {
    const delimiter = getDelimiter(absPath);
    const normalizedAbsPath = normalizePath(absPath);

    // Ensure no double delimiter and no missing delimiter
    const trimmedPath1 = normalizedAbsPath.endsWith(delimiter)
        ? normalizedAbsPath.slice(0, -1)
        : normalizedAbsPath;

    const trimmedPath2 = pathToAppend.startsWith(delimiter)
        ? pathToAppend.slice(1)
        : pathToAppend;

    return trimmedPath1 + delimiter + trimmedPath2;
}


export function getParentPath(absPath: string): string {
    const delimiter = getDelimiter(absPath);
    const segments = splitPath(absPath);

    // Special case for root paths
    if (segments.length === 0) {
        return delimiter; // Return root
    }

    // Remove the last segment and join the rest
    return (absPath.startsWith(delimiter) ? delimiter : '') + segments.slice(0, -1).join(delimiter);
}

export interface DirectoryItemDir extends DirectoryItem {
    type: 'directory'
}

export interface directoryItemFile extends DirectoryItem {
    type: 'file';
    size: number; // size in bytes
}

export async function getCurrentWorkingDirectory(): Promise<string> {
    const query = "SELECT pwd();"

    const result = await ConnectionsService.getInstance()
        .getConnection(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB)
        .executeQuery(query);

    return result.rows[0][0];
}

export type OrderOption = 'name' | 'size' | 'lastModified';


function getOrderByClause(option: OrderOption) {
    switch (option) {
        case 'name':
            return 'ORDER BY name';
        case 'size':
            return 'ORDER BY size';
        case 'lastModified':
            return 'ORDER BY lastModified DESC';
    }
}

export async function getDirectoryContent(path: string, orderBy: OrderOption = 'lastModified'): Promise<DirectoryItem[]> {
    const query = `
        SELECT absolute_path(path)      as path,
               file_name(path)          as "name",
               path_type(path)          as "type",
               file_size(path)          as "size",
               file_last_modified(path) as "lastModified"
        FROM ls('${path}') ${getOrderByClause(orderBy)};
    `

    const result = await ConnectionsService.getInstance()
        .getConnection(CONNECTION_ID_FILE_SYSTEM_OVER_DUCKDB)
        .executeQuery(query);

    return result.rows.map(row => {
        const [path, name, type, size, lastModified] = row;
        if (type === 'file') {
            return {name, path, type, size, lastModified};
        } else {
            return {name, path, type, lastModified};
        }
    });
}