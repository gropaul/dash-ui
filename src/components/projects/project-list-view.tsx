'use client';

import {useState} from "react";
import {Plus} from "lucide-react";
import {useProjectsState} from "@/state/projects.state";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {ProjectIcon, ProjectIconPicker} from "@/components/projects/project-icons";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {ViewPadding} from "@/components/ui/view-padding";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {DEFAULT_PROJECT_ICON, ProjectIconKey} from "@/model/project";

type CreateDialogState =
    | {mode: 'closed'}
    | {mode: 'create'; name: string; icon: ProjectIconKey};

/**
 * The `/projects` landing view: every available project as a card. Selecting one navigates to
 * its workspace (`/project/<id>/workspace`), where RouterProject takes over. The header hosts a
 * "New project" action that creates a project and opens it.
 */
export function ProjectListView() {
    const projects = useProjectsState((s) => s.projects);
    const createProject = useProjectsState((s) => s.createProject);
    const checkProjectName = useProjectsState((s) => s.checkProjectName);
    const ordered = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt);
    const nav = DashNavigator.instance();
    const openProject = (id: string) => nav.navigateToLocation(DashLocations.ProjectWorkspace(id));

    const [dialog, setDialog] = useState<CreateDialogState>({mode: 'closed'});
    const nameError = dialog.mode === 'closed' ? null : checkProjectName(dialog.name);

    function openCreate() {
        setDialog({mode: 'create', name: "", icon: DEFAULT_PROJECT_ICON});
    }

    async function save() {
        if (dialog.mode !== 'create' || nameError) return;
        const {name, icon} = dialog;
        setDialog({mode: 'closed'});
        const project = await createProject({name, icon});
        openProject(project.id);
    }

    return (
        <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent={'bg-accent'}>
            <ViewHeader
                title="Projects"
                actionButtons={
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4"/> New project
                    </Button>
                }
            />
            <div className="bg-card p-8 border rounded-2xl w-full h-full flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ordered.map((project) => (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => nav.navigateToLocation(DashLocations.ProjectWorkspace(project.id))}
                            className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-accent"
                        >
                            <ProjectIcon icon={project.icon}/>
                            <div className="min-w-0">
                                <div className="truncate font-medium">{project.name}</div>
                            </div>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <Plus className="h-5 w-5"/>
                        <span className="font-medium">New project</span>
                    </button>
                </div>
            </div>

            <Dialog open={dialog.mode !== 'closed'} onOpenChange={(open) => !open && setDialog({mode: 'closed'})}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New project</DialogTitle>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog({mode: 'closed'})}>Cancel</Button>
                        <Button onClick={save} disabled={!!nameError}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ViewPadding>
    );
}
