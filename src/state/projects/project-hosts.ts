import {Project} from "@/model/project";
import {DatabaseConnection} from "@/model/database-connection";
import {WorkspaceBackend} from "@/state/workspace/workspace-backend";
import {FolderBackend} from "@/state/workspace/folder-backend";
import {OpfsBackend, opfsEntries, opfsProjectsDirectory, readOpfsText, writeOpfsText} from "@/state/workspace/opfs-backend";
import {ServerBackend} from "@/state/workspace/server-backend";
import {DuckDBOverHttp} from "@/state/connections/duckdb-over-http";
import {parseProjectConfig, projectConfigText} from "@/state/projects/project-config";
import {PROJECT_CONFIG_FILE} from "@/platform/global-data";
import {deleteProjectArtifacts} from "@/state/projects/delete-project-artifacts";
import {getRandomLowercaseId} from "@/platform/id-utils";
import type {DashNativeWorkspaceApi} from "@/types/dash-native";

/**
 * Where a runtime keeps its projects and how it lists them. See dev/folder-projects.md. The optional actions are
 * the ones the runtime offers; the UI shows only those.
 */
export interface ProjectHost {
    kind: 'folders' | 'browser' | 'server';
    list(): Promise<Project[]>;
    backend(project: Project): WorkspaceBackend;
    /** Keeps what the list needs between sessions. */
    save(projects: Project[]): void;
    /** A new project, its `dash.yaml` written; in Electron a folder named after it in `parent`. */
    create?(name: string, parent?: string): Promise<Project>;
    /** Electron: the project in an existing folder; one without `dash.yaml` gets one. */
    openFolder?(folder: string): Promise<Project>;
    /** Electron forgets the project; the browser deletes its folder and databases. */
    remove?(project: Project): Promise<void>;
}

let host: ProjectHost | undefined;

export function projectHost(): ProjectHost {
    if (!host) throw new Error('No database connection, so no projects yet.');
    return host;
}

/** The host, or undefined before a connection is set: for UI that renders either way. */
export function currentProjectHost(): ProjectHost | undefined {
    return host;
}

export function selectProjectHost(connection: DatabaseConnection): ProjectHost {
    const native = typeof window !== 'undefined' ? window.dashNative : undefined;
    if (connection.type === 'duckdb-native' && native) host = new FolderProjects(native.workspace);
    else if (connection instanceof DuckDBOverHttp) host = new ServerProjects(connection);
    else host = new BrowserProjects();
    return host;
}

function readJson<T>(key: string, fallback: T): T {
    try {
        const stored = window.localStorage.getItem(key);
        return stored ? JSON.parse(stored) as T : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key: string, value: unknown) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // the list is rebuilt from the folders next time
    }
}

const RECENT_FOLDERS_KEY = 'dash-recent-projects';

/** Electron: any folder; the list is the recently opened ones. */
class FolderProjects implements ProjectHost {
    kind = 'folders' as const;

    constructor(private api: DashNativeWorkspaceApi) {
    }

    async list() {
        return readJson<Project[]>(RECENT_FOLDERS_KEY, []);
    }

    backend(project: Project) {
        return new FolderBackend(this.api, project.folder);
    }

    save(projects: Project[]) {
        writeJson(RECENT_FOLDERS_KEY, projects);
    }

    async create(name: string, parent?: string) {
        const base = (parent ?? await this.api.defaultParent()).replace(/[\\/]+$/, '');
        const separator = base.includes('\\') ? '\\' : '/';
        return this.adopt(base + separator + name.trim().replace(/[\\/:*?"<>|]/g, '-'), name.trim());
    }

    async openFolder(folder: string) {
        return this.adopt(folder, folder.split(/[\\/]/).filter(Boolean).at(-1) ?? folder);
    }

    async remove() {
    }

    private async adopt(folder: string, name: string): Promise<Project> {
        const text = await this.api.readConfig(folder) ?? undefined;
        const config = parseProjectConfig(text);
        const project = {id: config.id ?? getRandomLowercaseId(), name: config.name ?? name, folder, openedAt: Date.now()};
        if (!config.id || !config.name) await this.api.writeConfig(folder, projectConfigText(text, project.id, project.name));
        return project;
    }
}

const OPENED_AT_KEY = 'dash-projects-opened';

/** The browser: a folder per project in OPFS, named by the id. The list is those folders. */
class BrowserProjects implements ProjectHost {
    kind = 'browser' as const;

    async list() {
        const openedAt = readJson<Record<string, number>>(OPENED_AT_KEY, {});
        const projects: Project[] = [];
        for await (const [folder, handle] of opfsEntries(await opfsProjectsDirectory())) {
            if (handle.kind !== 'directory') continue;
            const config = parseProjectConfig(await readOpfsText(handle as FileSystemDirectoryHandle, PROJECT_CONFIG_FILE));
            const id = config.id ?? folder;
            projects.push({id, name: config.name ?? folder, folder, openedAt: openedAt[id] ?? 0});
        }
        return projects;
    }

    backend(project: Project) {
        return new OpfsBackend(project.folder);
    }

    save(projects: Project[]) {
        writeJson(OPENED_AT_KEY, Object.fromEntries(projects.map(p => [p.id, p.openedAt])));
    }

    async create(name: string) {
        const id = getRandomLowercaseId();
        const folder = await (await opfsProjectsDirectory()).getDirectoryHandle(id, {create: true});
        await writeOpfsText(folder, PROJECT_CONFIG_FILE, projectConfigText(undefined, id, name.trim()));
        return {id, name: name.trim(), folder: id, openedAt: Date.now()};
    }

    async remove(project: Project) {
        await (await opfsProjectsDirectory()).removeEntry(project.folder, {recursive: true})
            .catch(e => console.warn('Failed to delete the project folder:', project.folder, e));
        await deleteProjectArtifacts(project);
    }
}

/** duckdb-over-http: the server's working directory is the one project. */
class ServerProjects implements ProjectHost {
    kind = 'server' as const;

    constructor(private connection: DuckDBOverHttp) {
    }

    async list() {
        let text: string | undefined;
        try {
            const read = await this.connection.executeQuery(`SELECT content FROM read_text('${PROJECT_CONFIG_FILE}');`, false);
            text = read.rows[0]?.[0] as string | undefined;
        } catch {
            // no dash.yaml yet
        }
        const config = parseProjectConfig(text);
        let {id, name} = config;
        if (!id || !name) {
            const folder = await this.connection.executeQuery(`SELECT file_name(pwd());`, false);
            id ??= getRandomLowercaseId();
            name ??= String(folder.rows[0]?.[0] ?? 'Project');
            await this.connection.fileRequest('write-file', {path: PROJECT_CONFIG_FILE, content: projectConfigText(text, id, name), allow_override: true});
        }
        return [{id, name, folder: '', openedAt: Date.now()}];
    }

    backend() {
        return new ServerBackend(this.connection);
    }

    save() {
    }
}
