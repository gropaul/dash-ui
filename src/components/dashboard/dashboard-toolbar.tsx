import {Eye, Pencil, Plus, Sheet, Type} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {useRelationsState} from "@/state/relations.state";
import {DashboardState} from "@/model/dashboard-state";
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
    const addTextWidget = () => useRelationsState.getState().addTextWidgetToDashboard(dashboard.id);
    const addRelationWidget = (relationId: string) =>
        useRelationsState.getState().addRelationWidgetToDashboard(dashboard.id, relationId);

    const relationList = Object.values(relations);
    const hasRelations = dashboardRelationIds(dashboard).length > 0;
    const execState = getDashboardExecutionState(dashboard, relations);

    const actionButtons = (
        <>
            {editMode && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                            <Plus size={14}/> Add widget
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
                        <DropdownMenuItem onClick={addTextWidget}>
                            <Type size={14} className="mr-2"/> Text
                        </DropdownMenuItem>
                        <DropdownMenuSeparator/>
                        <DropdownMenuLabel>Relations</DropdownMenuLabel>
                        {relationList.length === 0 && (
                            <DropdownMenuItem disabled>No relations yet</DropdownMenuItem>
                        )}
                        {relationList.map(r => (
                            <DropdownMenuItem key={r.id} onClick={() => addRelationWidget(r.id)}>
                                <Sheet size={14} className="mr-2"/>
                                <span className="truncate">{r.viewState.displayName}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <Button variant={editMode ? "default" : "outline"} size="sm" className="h-8 gap-1"
                    onClick={onToggleEditMode}>
                {editMode ? <><Eye size={14}/> View</> : <><Pencil size={14}/> Edit</>}
            </Button>
        </>
    );

    return (
        <ViewHeader
            title={dashboard.viewState.displayName}
            path={[]}
            state={hasRelations ? execState : undefined}
            onRunClick={hasRelations ? () => runAllDashboardQueries(dashboard) : undefined}
            onCancelClick={hasRelations ? () => cancelAllDashboardQueries(dashboard) : undefined}
            actionButtons={actionButtons}
        />
    );
}
