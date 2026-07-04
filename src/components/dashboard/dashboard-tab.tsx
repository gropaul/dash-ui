import {useCallback, useEffect, useState} from "react";
import {shallow} from "zustand/shallow";
import dynamic from "next/dynamic";
import {useRelationsState} from "@/state/relations.state";
import {RelationView} from "@/components/relation/relation-view";
import {RelationState} from "@/model/relation-state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {DashboardToolbar} from "@/components/dashboard/dashboard-toolbar";
import {onRelationEvent} from "@/state/relations/event/relation-events";
import {refreshDownstreamRelations} from "@/state/relations/sql/relation-dag-refresh";

// react-grid-layout measures DOM width / uses ResizeObserver — unsafe under static export SSR.
const DashboardGrid = dynamic(
    () => import("@/components/dashboard/dashboard-grid").then(m => m.DashboardGrid),
    {ssr: false},
);

export interface DashboardViewProps {
    dashboardId: string;
}

export function DashboardTab(props: DashboardViewProps) {
    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);
    const updateRelation = useRelationsState(state => state.updateRelation);

    const [editMode, setEditMode] = useState(false);
    const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);
    const [manager] = useState(() => new InputManager());

    const openFullscreen = useCallback((widgetId: string) => setFullscreenWidgetId(widgetId), []);
    const onBack = useCallback(() => setFullscreenWidgetId(null), []);

    // When a relation's query finishes or a widget selection changes, re-run its downstream
    // relations (dependency graph derived from SQL). Mirrors the canvas' downstream refresh.
    useEffect(() => onRelationEvent(
        (event) => { if (event.new) void refreshDownstreamRelations(event.new.id); },
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), []);

    // Resolve the fullscreen widget → its referenced relation.
    const fullscreenWidget = fullscreenWidgetId ? dashboard?.widgets[fullscreenWidgetId] : undefined;
    const fullscreenRelationId = fullscreenWidget?.relationId;
    const fullscreenRelation = useRelationsState(
        state => fullscreenRelationId ? state.relations[fullscreenRelationId] : undefined,
        shallow,
    );

    if (!dashboard) {
        return <div>Dashboard not found: {props.dashboardId}</div>;
    }

    // Fullscreen editing takes over the whole tab (mirrors canvas-tab.tsx).
    if (fullscreenRelation) {
        return (
            <RelationView
                mode='fullscreen'
                relationState={fullscreenRelation}
                updateRelation={(newRelation: RelationState) => updateRelation(newRelation)}
                inputManager={manager}
                height={'fit'}
                breadcrumbPrefix={{label: dashboard.name, onClick: onBack}}
            />
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <DashboardToolbar
                dashboard={dashboard}
                editMode={editMode}
                onToggleEditMode={() => setEditMode(v => !v)}
            />
            <div className="flex-1 min-h-0 relative">
                <DashboardGrid
                    dashboard={dashboard}
                    editMode={editMode}
                    onOpenFullscreen={openFullscreen}
                />
            </div>
        </div>
    );
}
