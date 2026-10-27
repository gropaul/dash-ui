'use client';

import {useEffect, useState} from "react";
import {FolderOpen} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useProjectsState} from "@/state/projects.state";
import {currentProjectHost} from "@/state/projects/project-hosts";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";

function openProject(id: string) {
    DashNavigator.instance().navigateToLocation(DashLocations.ProjectWorkspace(id));
}

/** Electron: picks an existing folder and opens it as a project. */
export async function openProjectFolder() {
    const folder = await window.dashNative?.workspace.chooseFolder();
    if (!folder) return;
    const project = await useProjectsState.getState().openFolder(folder);
    openProject(project.id);
}

/** Asks for a name and creates the project; in Electron as a folder of that name, by default in `~/Documents/Dash`. */
export function NewProjectDialog({open, onOpenChange}: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const createProject = useProjectsState((s) => s.createProject);
    const checkProjectName = useProjectsState((s) => s.checkProjectName);
    const [name, setName] = useState("");
    const [parent, setParent] = useState<string | undefined>();
    const workspace = currentProjectHost()?.kind === 'folders' ? window.dashNative?.workspace : undefined;
    const error = checkProjectName(name);

    useEffect(() => {
        if (open) workspace?.defaultParent().then(setParent);
    }, [open, workspace]);

    const close = () => {
        setName("");
        onOpenChange(false);
    };

    async function create() {
        if (error) return;
        close();
        const project = await createProject(name, parent);
        openProject(project.id);
    }

    async function chooseParent() {
        const folder = await workspace?.chooseFolder();
        if (folder) setParent(folder);
    }

    return (
        <Dialog open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="project-name">Name</Label>
                        <Input
                            id="project-name"
                            autoFocus
                            placeholder="Untitled project"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && create()}
                        />
                        {error && name && <p className="text-xs text-destructive">{error}</p>}
                    </div>
                    {workspace && (
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <div className="flex items-center gap-1">
                                <div className="flex h-9 min-w-0 flex-1 items-center rounded-md border px-3 text-sm text-muted-foreground">
                                    <span className="truncate">{parent}</span>
                                </div>
                                <Button variant="outline" onClick={chooseParent}>
                                    <FolderOpen className="mr-2 h-4 w-4"/> Change…
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button onClick={create} disabled={!!error}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
