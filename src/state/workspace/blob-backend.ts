import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";

/** One stored text value; `StorageDuckAPI` in the browser, which throttles writes and checks versions. */
export interface BlobStorage {
    getItem(): Promise<string | null>;
    setItem(value: string): Promise<void>;
}

/**
 * The browser backend: the store is the file system, and every change saves the whole workspace as one
 * JSON value.
 */
export class BlobBackend implements WorkspaceBackend {
    constructor(private storage: BlobStorage, private snapshot: () => WorkspaceSnapshot) {
    }

    async load(): Promise<WorkspaceSnapshot> {
        const stored = await this.storage.getItem();
        const parsed = stored ? JSON.parse(stored) as Partial<WorkspaceSnapshot> : {};
        return {files: parsed.files ?? {}, dirs: parsed.dirs ?? []};
    }

    write = () => this.save();
    mkdir = () => this.save();
    move = () => this.save();
    remove = () => this.save();

    private save() {
        const {files, dirs} = this.snapshot();
        return this.storage.setItem(JSON.stringify({files, dirs}));
    }
}
