'use client';

import {useState} from "react";
import {Check, ChevronDown, FolderOpen, LayoutGrid, Pencil, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useProjectsState, useRoutedProject} from "@/state/projects.state";
import {renameCurrentProject} from "@/state/projects/project-actions";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {currentProjectHost} from "@/state/projects/project-hosts";
import {FolderEntries} from "@/components/layout/workspace-path-breadcrumb";
import {NewProjectDialog, openProjectFolder} from "@/components/projects/new-project-dialog";

/**
 * The current-project chip in the app bar. Doubles as the root of the path breadcrumb:
 * the name drops down the project's root entries, the chevron opens the switcher.
 * Lets the user switch, create, open (Electron), rename and remove projects.
 */
export function ProjectSwitcher() {
    const projects = useProjectsState((s) => s.projects);
    // The chip reflects the URL, not the last-loaded project: when the URL names a project that doesn't
    // exist (or no project at all, e.g. the projects list), show a neutral "select a project" chip
    // instead (the dropdown still lists real ones). `current` is undefined in that case.
    const {project: current} = useRoutedProject();
    const removeProject = useProjectsState((s) => s.removeProject);
    const checkProjectName = useProjectsState((s) => s.checkProjectName);
    const host = currentProjectHost();

    const nav = DashNavigator.instance();
    const openProject = (id: string) => nav.navigateToLocation(DashLocations.ProjectWorkspace(id));

    const [creating, setCreating] = useState(false);
    const [editName, setEditName] = useState<string | null>(null);

    const ordered = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt);
    const nameError = editName === null || !current ? null : checkProjectName(editName, current.id);

    async function save() {
        if (nameError || editName === null) return;
        setEditName(null);
        // URLs are id-based, so a rename doesn't touch the URL.
        await renameCurrentProject(editName);
    }

    async function removeCurrent() {
        setEditName(null);
        if (!current) return;
        removeProject(current.id);
        // removeProject reselects the most-recent project; navigate to it.
        const next = useProjectsState.getState();
        if (next.currentProjectId) openProject(next.currentProjectId);
        else nav.navigateToLocation(DashLocations.ProjectsList());
        void host?.remove?.(current);
    }

    const currentLocation = nav.getCurrentLocation();
    if (currentLocation.basePath != 'project') {
        return null;
    }

    return (
        <>
            <div className="flex items-center min-w-0 max-w-[240px] gap-0 rounded-2xl hover:bg-accent">
                {/* The name drops down the project's root entries, as a folder crumb does; only the chevron opens the switcher. */}
                {!current ? (
                    <Button
                        variant="ghost"
                        className="h-8 flex flex-row items-center gap-0 pl-1 pr-1 min-w-0 rounded-l-2xl rounded-r-none"
                        aria-label="Select a project"
                        onClick={() => nav.navigateToLocation(DashLocations.ProjectsList())}
                    >
                        <span className="min-w-0 truncate font-medium text-muted-foreground px-1">Select a project</span>
                    </Button>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 flex flex-row items-center gap-0 pl-1 pr-1 min-w-0 rounded-l-2xl rounded-r-none"
                                aria-label={`Show the files of ${current.name}`}
                            >
                                <span className="min-w-0 truncate font-medium px-1">{current.name}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-w-[320px]">
                            <FolderEntries projectId={current.id} folder=""/>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-4 pl-0 pr-1 rounded-r-2xl rounded-l-none" aria-label="Switch project">
                            <ChevronDown size={4} className="text-muted-foreground"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Projects</DropdownMenuLabel>
                    {ordered.map((project) => (
                        <DropdownMenuItem key={project.id} onClick={() => openProject(project.id)}>
                            <span className="truncate">{project.name}</span>
                            {project.id === current?.id && <Check className="ml-auto h-4 w-4"/>}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={() => nav.navigateToLocation(DashLocations.ProjectsList())}>
                        <LayoutGrid className="mr-2 h-4 w-4"/> All projects
                    </DropdownMenuItem>
                    {host?.create && (
                        <DropdownMenuItem onClick={() => setCreating(true)}>
                            <Plus className="mr-2 h-4 w-4"/> New project
                        </DropdownMenuItem>
                    )}
                    {host?.openFolder && (
                        <DropdownMenuItem onClick={openProjectFolder}>
                            <FolderOpen className="mr-2 h-4 w-4"/> Open folder…
                        </DropdownMenuItem>
                    )}
                    {current && (
                        <DropdownMenuItem onClick={() => setEditName(current.name)}>
                            <Pencil className="mr-2 h-4 w-4"/> Edit project
                        </DropdownMenuItem>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <NewProjectDialog open={creating} onOpenChange={setCreating}/>
            <Dialog open={editName !== null} onOpenChange={(open) => !open && setEditName(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Name</Label>
                            <Input
                                id="project-name"
                                autoFocus
                                value={editName ?? ""}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && save()}
                            />
                            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                        </div>
                        {current?.folder && host?.kind === 'folders' && (
                            <p className="truncate text-xs text-muted-foreground">{current.folder}</p>
                        )}
                    </div>
                    <DialogFooter className="sm:justify-between">
                        {host?.remove ? (
                            <Button variant="ghost" className="text-destructive" onClick={removeCurrent}>
                                <Trash2 className="mr-2 h-4 w-4"/> {host.kind === 'folders' ? "Remove from list" : "Delete"}
                            </Button>
                        ) : <span/>}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setEditName(null)}>Cancel</Button>
                            <Button onClick={save} disabled={!!nameError}>Save</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
