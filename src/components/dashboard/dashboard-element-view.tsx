import {
    DashboardElement,
    DashboardElementBase,
    DashboardElementData, DashboardElementText
} from "@/model/dashboard-state";
import {DashboardDataView} from "@/components/dashboard/dashboard-element-view/dashboard-data-view";
import {DashboardTextView} from "@/components/dashboard/dashboard-element-view/dashboard-text-view";


interface DashboardElementViewProps {
    dashboardId: string;
    dashboardElement: DashboardElement;
}

export function DashboardElementView(props: DashboardElementViewProps) {
    if (props.dashboardElement.type === 'text') {
        return <DashboardTextView dashboardId={props.dashboardId} element={props.dashboardElement as DashboardElementText}/>
    }
    if (props.dashboardElement.type === 'data') {
        return <DashboardDataView element={props.dashboardElement as DashboardElementData}/>
    }
}