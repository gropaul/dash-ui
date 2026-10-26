import {WorkspaceBackend, WorkspaceSnapshot} from "@/state/workspace/workspace-backend";
import type {DashNativeWorkspaceApi} from "@/types/dash-native";

/** The Electron backend: the project's files are a real folder, kept by the main process (electron/workspace-fs.cjs). */
export class FolderBackend implements WorkspaceBackend {
    constructor(private api: DashNativeWorkspaceApi, private folder: string) {
    }

    load(): Promise<WorkspaceSnapshot> {
        return this.api.open(this.folder);
    }

    write = (path: string, text: string) => this.api.write(path, text);
    mkdir = (path: string) => this.api.mkdir(path);
    move = (from: string, to: string) => this.api.move(from, to);
    remove = (path: string) => this.api.remove(path);

    watch(onOutsideChange: (path: string, text: string | null) => void): () => void {
        const unsubscribe = this.api.onChanged(onOutsideChange);
        return () => {
            unsubscribe();
            void this.api.close();
        };
    }
}
