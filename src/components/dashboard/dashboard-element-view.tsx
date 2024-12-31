import {DashboardElement, DashboardElementText, DashboardElementData} from "@/model/dashboard-state";
import {DashboardTextView} from "@/components/dashboard/dashboard-element-view/dashboard-text-view";
import {DashboardDataView} from "@/components/dashboard/dashboard-element-view/dashboard-data-view";


interface DashboardElementViewProps {
    dashboardElement: DashboardElement;
}

export function DashboardElementView(props: DashboardElementViewProps) {
    if (props.dashboardElement.type === 'text') {
        return <DashboardTextView element={props.dashboardElement as DashboardElementText}/>
    }
    if (props.dashboardElement.type === 'data') {
        return <DashboardDataView element={props.dashboardElement as DashboardElementData}/>
    }
}