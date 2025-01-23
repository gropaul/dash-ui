import {DashboardCommandState} from "@/components/workbench/editor-overview-tab";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {DashboardState} from "@/model/dashboard-state";

interface DashboardCommandProps extends DashboardCommandState {
    dashboards: DashboardState[];
    setOpen: (open: boolean) => void;
    onDashboardSelected: (dashboard: DashboardState) => void;
}

export function DashboardCommand(props: DashboardCommandProps) {

    return (
        <CommandDialog open={props.open} onOpenChange={props.setOpen}>
            <Command className={'min-h-[300px]'}>
                <CommandInput placeholder="Search for Dashboards ..." />
                <CommandList>
                    <CommandEmpty>No Dashboards found</CommandEmpty>
                    <CommandGroup>
                        {props.dashboards.map(dashboard => (
                            <CommandItem
                                key={dashboard.id}
                                onSelect={() => {
                                    props.onDashboardSelected(dashboard);
                                    props.setOpen(false);
                                }}
                            >
                                {dashboard.viewState.displayName}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    )
}