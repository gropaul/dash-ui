import {
    DashboardElement,
    DashboardElementBase,
    DashboardElementData, DashboardElementText
} from "@/model/dashboard-state";
import {DashboardDataView} from "@/components/dashboard/dashboard-element-view/dashboard-data-view";
import {DashboardTextView} from "@/components/dashboard/dashboard-element-view/dashboard-text-view";


interface DashboardElementViewProps {
    dashboardId: string;
    elementIndex: number;
    elementsCount: number;
    dashboardElement: DashboardElement;
}

export function DashboardElementView(props: DashboardElementViewProps) {
    if (props.dashboardElement.type === 'text') {
        return <DashboardTextView
            dashboardId={props.dashboardId}
            element={props.dashboardElement as DashboardElementText}
            elementIndex={props.elementIndex}
            elementsCount={props.elementsCount}
        />
    }
    if (props.dashboardElement.type === 'data') {
        return <DashboardDataView
            dashboardId={props.dashboardId}
            element={props.dashboardElement as DashboardElementData}
            elementIndex={props.elementIndex}
            elementsCount={props.elementsCount}
        />
    }
}