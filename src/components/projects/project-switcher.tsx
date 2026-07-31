'use client';

import {useState} from "react";
import {Check, ChevronDown, Pencil, Plus, Trash2} from "lucide-react";
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
import {ProjectIcon, ProjectIconPicker} from "@/components/projects/project-icons";
import {useProjectsState, useRoutedProject} from "@/state/projects.state";
import {DEFAULT_PROJECT_ICON, ProjectIconKey} from "@/model/project";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {deleteProjectArtifacts} from "@/state/projects/delete-project-artifacts";

type DialogState =
    | {mode: 'closed'}
    | {mode: 'create'; name: string; icon: ProjectIconKey}
    | {mode: 'edit'; id: string; name: string; icon: ProjectIconKey};

/**
 * The current-project chip in the app bar. Doubles as the root of the path breadcrumb:
 * the name opens the project's workspace, the chevron opens the switcher.
 * Lets the user switch, create, rename, re-icon, and delete projects.
 */
export function ProjectSwitcher() {
    const projects = useProjectsState((s) => s.projects);
    // The chip reflects the URL, not the last-loaded project: when the URL names a project that doesn't
    // exist (or no project at all, e.g. the projects list), show a neutral "select a project" chip
    // instead (the dropdown still lists real ones). `current` is undefined in that case.
    const {project: current} = useRoutedProject();
    const createProject = useProjectsState((s) => s.createProject);
    const renameProject = useProjectsState((s) => s.renameProject);
    const setProjectIcon = useProjectsState((s) => s.setProjectIcon);
    const removeProject = useProjectsState((s) => s.removeProject);
    const checkProjectName = useProjectsState((s) => s.checkProjectName);

    const nav = DashNavigator.instance();
    const openProject = (id: string) => nav.navigateToLocation(DashLocations.ProjectWorkspace(id));

    const [dialog, setDialog] = useState<DialogState>({mode: 'closed'});

    const ordered = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt);
    const canDelete = ordered.length > 1;

    // Live name validation from the store (excludes the edited project from the dup check).
    // Depends on `projects` (subscribed above), so it re-runs as projects change.
    const nameError = dialog.mode === 'closed'
        ? null
        : checkProjectName(dialog.name, dialog.mode === 'edit' ? dialog.id : undefined);

    function openCreate() {
        setDialog({mode: 'create', name: "", icon: DEFAULT_PROJECT_ICON});
    }

    function openEdit() {
        if (!current) return;
        setDialog({mode: 'edit', id: current.id, name: current.name, icon: current.icon});
    }

    async function save() {
        if (nameError) return;

        setDialog({mode: 'closed'});
        if (dialog.mode === 'create') {
            const project = await createProject({name: dialog.name, icon: dialog.icon});
            openProject(project.id);
        } else if (dialog.mode === 'edit') {
            // URLs are id-based, so a rename doesn't touch the URL — just update name/icon.
            renameProject(dialog.id, dialog.name);
            setProjectIcon(dialog.id, dialog.icon);
        }

    }

    async function deleteCurrent() {
        if (dialog.mode !== 'edit') {
            setDialog({mode: 'closed'});
            return;
        }
        const deletedId = dialog.id;
        removeProject(deletedId);
        // removeProject reselects the most-recent project; navigate to it.
        const next = useProjectsState.getState();
        const project = next.projects[next.currentProjectId ?? ""];
        if (project) openProject(project.id);
        setDialog({mode: 'closed'});
        void deleteProjectArtifacts(deletedId);
    }

    const currentLocation = nav.getCurrentLocation();
    if (currentLocation.basePath != 'project') {
        return null;
    }

    return (
        <>
            <div className="flex items-center min-w-0 max-w-[240px] gap-0 rounded-2xl hover:bg-muted">
                {/* Name + icon open the project root folder; only the chevron opens the switcher. */}
                <Button
                    variant="ghost"
                    className="h-8 flex flex-row items-center gap-0 pl-1 pr-1 min-w-0 rounded-l-2xl"
                    aria-label={!current ? "Select a project" : `Open ${current.name}`}
                    onClick={() => !current
                        ? nav.navigateToLocation(DashLocations.ProjectsList())
                        : openProject(current.id)}
                >
                    {!current ? (
                        <span className="min-w-0 truncate font-medium text-muted-foreground px-1">Select a project</span>
                    ) : (
                        <>
                            <ProjectIcon icon={current.icon} className="ml-1 mr-4"/>
                            <span className="min-w-0 truncate font-medium">{current.name}</span>
                        </>
                    )}
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-4 pl-0 pr-1 rounded-r-2xl" aria-label="Switch project">
                            <ChevronDown size={4} className="text-muted-foreground"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Projects</DropdownMenuLabel>
                    {ordered.map((project) => (
                        <DropdownMenuItem key={project.id} onClick={() => openProject(project.id)}>
                            <ProjectIcon icon={project.icon} size={13} className="mr-2 h-5 w-5"/>
                            <span className="truncate">{project.name}</span>
                            {project.id === current?.id && <Check className="ml-auto h-4 w-4"/>}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4"/> New project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={openEdit}>
                        <Pencil className="mr-2 h-4 w-4"/> Edit project
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={dialog.mode !== 'closed'} onOpenChange={(open) => !open && setDialog({mode: 'closed'})}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{dialog.mode === 'create' ? "New project" : "Edit project"}</DialogTitle>
                    </DialogHeader>
                    {dialog.mode !== 'closed' && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="project-name">Name</Label>
                                <Input
                                    id="project-name"
                                    autoFocus
                                    placeholder="Untitled project"
                                    value={dialog.name}
                                    onChange={(e) => setDialog({...dialog, name: e.target.value})}
                                    onKeyDown={(e) => e.key === 'Enter' && save()}
                                />
                                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Icon</Label>
                                <ProjectIconPicker
                                    value={dialog.icon}
                                    onChange={(icon) => setDialog({...dialog, icon})}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between">
                        {dialog.mode === 'edit' && canDelete ? (
                            <Button variant="ghost" className="text-destructive" onClick={deleteCurrent}>
                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                            </Button>
                        ) : <span/>}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialog({mode: 'closed'})}>Cancel</Button>
                            <Button onClick={save} disabled={!!nameError}>{dialog.mode === 'create' ? "Create" : "Save"}</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
