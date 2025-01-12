import {DashboardElementData} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationQueryParams} from "@/model/relation-state";
import {DeepPartial} from "@/platform/utils";
import {RelationViewState} from "@/model/relation-view-state";


export interface DashboardDataViewProps {
    element: DashboardElementData;
}

export function DashboardDataView(props: DashboardDataViewProps){

    async function updateRelationDataWithParams(relationId: string, query: RelationQueryParams) {
    }

    function updateRelationBaseQuery(relationId: string, baseQuery: string) {
    }

    function updateRelationViewState(relationId: string, viewState: DeepPartial<RelationViewState>) {
    }
    console.log("DashboardDataView", props.element);
    return <RelationStateView
        relationState={props.element.data}
        updateRelationDataWithParams={updateRelationDataWithParams}
        updateRelationBaseQuery={updateRelationBaseQuery}
        updateRelationViewState={updateRelationViewState}
    />;
}