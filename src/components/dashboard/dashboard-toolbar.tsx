import {Eye, Pencil, Plus, Type} from "lucide-react";
import {Button} from "@/components/ui/button";
import {CommandButton} from "@/components/ui/command-button";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {useRelationsState} from "@/state/relations.state";
import {useGUIState} from "@/state/gui.state";
import {DashboardState} from "@/model/dashboard-state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {findPathById} from "@/components/basics/files/tree-utils";
import {MAIN_CONNECTION_ID} from "@/platform/global-data";
import {
    cancelAllDashboardQueries,
    dashboardRelationIds,
    getDashboardExecutionState,
    runAllDashboardQueries,
} from "@/state/dashboard/dashboard-run";

interface DashboardToolbarProps {
    dashboard: DashboardState;
    editMode: boolean;
    onToggleEditMode: () => void;
}

export function DashboardToolbar({dashboard, editMode, onToggleEditMode}: DashboardToolbarProps) {
    const relations = useRelationsState(s => s.relations);

    // Create a brand-new (empty) relation, place it next to the dashboard in the tree, and add it
    // as a widget — the dashboard's own "new query" entry point.
    const addNewRelationWidget = () => {
        const relation = RelationActions.create({showCode: true, viewType: 'table'});
        const editorElements = useRelationsState.getState().editorElements;
        const dashboardPath = findPathById(editorElements, dashboard.id);
        const parentPath = dashboardPath ? dashboardPath.slice(0, -1) : [];
        useRelationsState.getState().addNewRelation(MAIN_CONNECTION_ID, parentPath, relation, false);
        useRelationsState.getState().addRelationWidgetToDashboard(dashboard.id, relation.id);
    };

    // Open the shared command palette as the "add widget" picker: it lists existing relations to
    // drop onto this dashboard, with quick-add buttons (text / new relation) in the slot.
    const openAddWidget = () => {
        useGUIState.getState().openCommand({
            action: 'add-relation-to-dashboard',
            filter: ['relations'],
            slot: (
                <div className="flex w-full gap-2.5">
                    <CommandButton
                        className="flex-1"
                        icon={<Type size={16}/>}
                        onClick={() => {
                            useRelationsState.getState().addTextWidgetToDashboard(dashboard.id);
                            useGUIState.getState().closeCommand();
                        }}
                    >
                        Add text
                    </CommandButton>
                    <CommandButton
                        className="flex-1"
                        icon={<Plus size={16}/>}
                        onClick={() => {
                            addNewRelationWidget();
                            useGUIState.getState().closeCommand();
                        }}
                    >
                        New relation
                    </CommandButton>
                </div>
            ),
            onSelect: (entity) => {
                useRelationsState.getState().addRelationWidgetToDashboard(dashboard.id, entity.id);
            },
        });
    };

    const hasRelations = dashboardRelationIds(dashboard).length > 0;
    const execState = getDashboardExecutionState(dashboard, relations);

    const actionButtons = (
        <>
            {editMode && (
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={openAddWidget}>
                    <Plus size={14}/> Add widget
                </Button>
            )}
            <Button variant={editMode ? "default" : "outline"} size="sm" className="h-8 gap-1"
                    onClick={onToggleEditMode}>
                {editMode ? <><Eye size={14}/> View</> : <><Pencil size={14}/> Edit</>}
            </Button>
        </>
    );

    const titleComponent = (
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
            <span className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                {dashboard.viewState.displayName}
            </span>
        </div>
    );

    return (
        <ViewHeader
            title={dashboard.viewState.displayName}
            titleComponent={titleComponent}
            state={hasRelations ? execState : undefined}
            onRunClick={hasRelations ? () => runAllDashboardQueries(dashboard) : undefined}
            onCancelClick={hasRelations ? () => cancelAllDashboardQueries(dashboard) : undefined}
            reserveRunButtonSpace
            actionButtons={actionButtons}
        />
    );
}
