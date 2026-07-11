import {useState} from "react";
import {Eye, Pencil, Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ColoredIcon} from "@/components/basics/files/icon-factories";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
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
    const [addOpen, setAddOpen] = useState(false);

    const addTextWidget = () => {
        useRelationsState.getState().addTextWidgetToDashboard(dashboard.id);
        setAddOpen(false);
    };
    const addRelationWidget = (relationId: string) => {
        useRelationsState.getState().addRelationWidgetToDashboard(dashboard.id, relationId);
        setAddOpen(false);
    };

    const relationList = Object.values(relations);
    const hasRelations = dashboardRelationIds(dashboard).length > 0;
    const execState = getDashboardExecutionState(dashboard, relations);

    const actionButtons = (
        <>
            {editMode && (
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                            <Plus size={14}/> Add widget
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-0">
                        <Command>
                            <CommandInput placeholder="Add widget…"/>
                            <CommandList>
                                <CommandEmpty>No widget found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem value="Text" onSelect={addTextWidget}>
                                        <ColoredIcon type="text" size={16} background={false}/>
                                        Text
                                    </CommandItem>
                                </CommandGroup>
                                <CommandSeparator/>
                                <CommandGroup heading="Relations">
                                    {relationList.map(r => (
                                        <CommandItem
                                            key={r.id}
                                            value={r.viewState.displayName}
                                            onSelect={() => addRelationWidget(r.id)}
                                        >
                                            <ColoredIcon type={r.viewState.selectedView ?? "relations"} size={16} background={false}/>
                                            <span className="truncate">{r.viewState.displayName}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
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
