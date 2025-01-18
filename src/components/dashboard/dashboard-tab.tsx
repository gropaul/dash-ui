import {DashboardElementView} from "@/components/dashboard/dashboard-element-view";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DashboardElementDivider} from "@/components/dashboard/dashboard-element-divider";
import {DashboardElementType, getInitialElement} from "@/model/dashboard-state";
import {DashboardContent} from "@/components/dashboard/dashboard-content";


export interface DashboardViewProps {
    dashboardId: string;
}

export function DashboardTab(props: DashboardViewProps) {

    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);
    const updateDashboardViewState = useRelationsState((state) => state.updateDashboardViewState);

    function onRenameDisplay(name: string) {
        updateDashboardViewState(props.dashboardId, {
            displayName: name
        });
    }

    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={dashboard.viewState.displayName} onTitleChange={onRenameDisplay} path={[]}/>
            <div className="flex-1 overflow-auto relative">
                <DashboardContent dashboard={dashboard}/>
            </div>
        </div>
    )
}
