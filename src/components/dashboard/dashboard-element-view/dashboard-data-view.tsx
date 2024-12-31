import {DashboardElementData} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";


export interface DashboardDataViewProps {
    element: DashboardElementData;
}

export function DashboardDataView(props: DashboardDataViewProps){


    console.log("DashboardDataView", props.element);
    return <>
        Under Construction
    </>

    return <RelationStateView relationState={props.element.data} />
}