import {useCallback, useEffect} from "react";
import {shallow} from "zustand/shallow";
import dynamic from "next/dynamic";
import {useRelationsState} from "@/state/relations.state";
import {aliasRelationLocation, buildRoutableTree} from "@/state/routing/routable-tree";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashQueryParam} from "@/state/routing/use-dash-location";
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

    // Edit is the default; `?readonly=1` opens the dashboard in view mode (shareable / deep-linkable).
    const editMode = useDashQueryParam("readonly") !== "1";
    const toggleEditMode = useCallback(() => {
        DashNavigator.instance().setQueryParam("readonly", editMode ? "1" : null);
    }, [editMode]);

    // Expand a widget → navigate to its relation shown in this dashboard's context
    // (`…/Dashboard/Relation`), not the relation's canonical path.
    const openRelation = useCallback((widgetId: string) => {
        const st = useRelationsState.getState();
        const relationId = st.getDashboardState(props.dashboardId)?.widgets[widgetId]?.relationId;
        if (!relationId) return;
        const tree = buildRoutableTree(st.editorElements, st.relations, st.dashboards, st.canvas);
        const loc = aliasRelationLocation(tree, props.dashboardId, relationId);
        if (loc) DashNavigator.instance().navigateToLocation(loc);
    }, [props.dashboardId]);

    // When a relation's query finishes or a widget selection changes, re-run its downstream
    // relations (dependency graph derived from SQL). Mirrors the canvas' downstream refresh.
    useEffect(() => onRelationEvent(
        (event) => { if (event.new) void refreshDownstreamRelations(event.new.id); },
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), []);

    if (!dashboard) {
        return <div>Dashboard not found: {props.dashboardId}</div>;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0 relative">
                <DashboardGrid
                    dashboard={dashboard}
                    editMode={editMode}
                    onToggleEditMode={toggleEditMode}
                    onOpenFullscreen={openRelation}
                />
            </div>
        </div>
    );
}
