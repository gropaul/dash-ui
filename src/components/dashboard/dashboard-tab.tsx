import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DashboardContent} from "@/components/dashboard/dashboard-content";
import {useEffect} from "react";


export interface DashboardViewProps {
    dashboardId: string;
}

export function DashboardTab(props: DashboardViewProps) {

    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);

    if (!dashboard) {
        return <div>Dashboard not found: {props.dashboardId}</div>
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-auto relative">
                <DashboardContent dashboard={dashboard}/>
            </div>
        </div>
    )
}
