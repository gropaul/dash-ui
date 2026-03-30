import {getInitialTabViewBaseState, TabViewBaseState} from "@/model/relation-view-state";
import {OutputData} from "@editorjs/editorjs";


export interface DashboardViewState extends TabViewBaseState {

}

export function getInitDashboardViewState(displayName: string): DashboardViewState {
    return {
        ...getInitialTabViewBaseState(displayName),
    };
}

export interface DashboardState {
    id: string;
    name: string;
    elementState?: OutputData;
    viewState: DashboardViewState;
}