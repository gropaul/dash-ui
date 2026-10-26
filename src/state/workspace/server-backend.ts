import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";
import {DuckDBOverHttp} from "@/state/connections/duckdb-over-http";
import {formatValueForSql as lit} from "@/platform/sql-utils";

const SKIPPED_DIRS = ['node_modules'];

const isListed = (path: string) => path.split('/').every(segment => !segment.startsWith('.') && !SKIPPED_DIRS.includes(segment));

/**
 * The duckdb-over-http backend: the project is the server's working directory. Files are read through SQL
 * (`glob`, `read_text`) and changed through the server's file endpoints, one change at a time.
 */
export class ServerBackend implements WorkspaceBackend {
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private connection: DuckDBOverHttp) {
    }

    async load(): Promise<WorkspaceSnapshot> {
        const found = await this.connection.executeQuery(
            `SELECT file FROM glob('**/*.md') UNION ALL SELECT file FROM glob('**/*.sql') UNION ALL SELECT file FROM glob('dash.yaml');`,
            false);
        const paths = found.rows.map(([file]) => String(file).replaceAll('\\', '/').replace(/^\.\//, '')).filter(isListed);
        if (paths.length === 0) return {files: {}, dirs: []};
        const read = await this.connection.executeQuery(
            `SELECT filename, content FROM read_text([${paths.map(p => lit(p)).join(', ')}]);`, false);
        const files: Record<string, string> = {};
        read.rows.forEach(([file, content]) => files[String(file).replaceAll('\\', '/').replace(/^\.\//, '')] = String(content ?? ''));
        return {files, dirs: []};
    }

    write = (path: string, text: string) => this.run('write-file', {path, content: text, allow_override: true});
    mkdir = (path: string) => this.run('make-directory', {path});
    move = (from: string, to: string) => this.run('move-file', {from, to});
    remove = (path: string) => this.run('remove-file', {path});

    private run(endpoint: Parameters<DuckDBOverHttp['fileRequest']>[0], body: Record<string, unknown>): Promise<void> {
        const change = () => this.connection.fileRequest(endpoint, body);
        const next = this.queue.then(change, change);
        this.queue = next.catch(() => undefined);
        return next;
    }
}
