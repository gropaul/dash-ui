'use client';

import {useState} from "react";
import {FolderOpen, Plus} from "lucide-react";
import {useProjectsState} from "@/state/projects.state";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {currentProjectHost} from "@/state/projects/project-hosts";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {ViewPadding} from "@/components/ui/view-padding";
import {Button} from "@/components/ui/button";
import {NewProjectDialog, openProjectFolder} from "@/components/projects/new-project-dialog";

/**
 * The `/projects` landing view: every project as a card. Selecting one navigates to its workspace
 * (`/projects/<id>/workspace`), where RouterProject takes over. The header creates a project, and in Electron
 * opens a folder as one.
 */
export function ProjectListView() {
    const projects = useProjectsState((s) => s.projects);
    const ordered = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt);
    const nav = DashNavigator.instance();
    const host = currentProjectHost();
    const [creating, setCreating] = useState(false);

    return (
        <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent={'bg-accent'}>
            <ViewHeader
                title="Projects"
                actionButtons={
                    <div className="flex gap-2">
                        {host?.openFolder && (
                            <Button size="sm" variant="outline" onClick={openProjectFolder}>
                                <FolderOpen className="mr-2 h-4 w-4"/> Open folder…
                            </Button>
                        )}
                        {host?.create && (
                            <Button size="sm" onClick={() => setCreating(true)}>
                                <Plus className="mr-2 h-4 w-4"/> New project
                            </Button>
                        )}
                    </div>
                }
            />
            <div className="bg-card p-8 border rounded-2xl w-full h-full flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ordered.map((project) => (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => nav.navigateToLocation(DashLocations.ProjectWorkspace(project.id))}
                            className="flex flex-col rounded-2xl border p-4 text-left transition-colors hover:bg-accent"
                        >
                            <span className="truncate font-medium">{project.name}</span>
                            {host?.kind === 'folders' && <span className="truncate text-xs text-muted-foreground">{project.folder}</span>}
                        </button>
                    ))}
                    {host?.create && (
                        <button
                            type="button"
                            onClick={() => setCreating(true)}
                            className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <Plus className="h-5 w-5"/>
                            <span className="font-medium">New project</span>
                        </button>
                    )}
                </div>
            </div>
            <NewProjectDialog open={creating} onOpenChange={setCreating}/>
        </ViewPadding>
    );
}
