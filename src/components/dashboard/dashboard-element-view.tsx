import {
    DashboardElement,
    DashboardElementBase,
    DashboardElementData, DashboardElementText
} from "@/model/dashboard-state";
import {DashboardDataView} from "@/components/dashboard/dashboard-element-view/dashboard-data-view";
import {DashboardTextView} from "@/components/dashboard/dashboard-element-view/dashboard-text-view";
import {FocusState} from "@/components/dashboard/dashboard-content";


export interface DashboardMacroProps {
    dashboardId: string;
    elementIndex: number;
    elementsCount: number;
    elementsOrder: string[];
    selected: boolean;
    focusState: FocusState;
    setFocusState: (elementId: FocusState) => void;
}

export interface DashboardElementViewProps extends DashboardMacroProps {
    dashboardElement: DashboardElement;
}


export function DashboardElementView(props: DashboardElementViewProps) {
    if (props.dashboardElement.type === 'text') {
        return <DashboardTextView
            {...props}
            element={props.dashboardElement as DashboardElementText}
        />
    }
    if (props.dashboardElement.type === 'data') {
        return <DashboardDataView
            {...props}
            element={props.dashboardElement as DashboardElementData}
        />
    }
}