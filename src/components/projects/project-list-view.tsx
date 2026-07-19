'use client';

import {useProjectsState} from "@/state/projects.state";
import {DashLocations, DashNavigator} from "@/state/routing/navigation";
import {ProjectIcon} from "@/components/projects/project-icons";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {ViewPadding} from "@/components/ui/view-padding";

/**
 * The `/projects` landing view: every available project as a card. Selecting one navigates to
 * its root (`/projects/<slug>`), where ProjectRouter takes over.
 */
export function ProjectListView() {
    const projects = useProjectsState((s) => s.projects);
    const ordered = Object.values(projects).sort((a, b) => b.openedAt - a.openedAt);
    const nav = DashNavigator.instance();

    return (
        <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent={'bg-accent'}>
            <ViewHeader title="Projects"/>
            <div className="bg-card p-8 border rounded-2xl w-full h-full flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ordered.map((project) => (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => nav.navigateToLocation(DashLocations.ProjectRoot(project.slug))}
                            className="flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors hover:bg-accent"
                        >
                            <ProjectIcon icon={project.icon}/>
                            <div className="min-w-0">
                                <div className="truncate font-medium">{project.name}</div>
                                <div className="truncate text-xs text-muted-foreground font-mono">/{project.slug}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </ViewPadding>
    );
}
