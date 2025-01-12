import {DashboardElementData, TYPE_OPTIONS_DATA} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {RelationQueryParams} from "@/model/relation-state";
import {DeepPartial} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {ViewElementBase, ViewElementBaseProps} from "@/components/dashboard/components/view-element-base";


export interface DashboardDataViewProps {
    dashboardId: string;
    element: DashboardElementData;
}

export function DashboardDataView(props: DashboardDataViewProps){

    async function updateRelationDataWithParams(relationId: string, query: RelationQueryParams) {
    }

    function updateRelationBaseQuery(relationId: string, baseQuery: string) {
    }

    function updateRelationViewState(relationId: string, viewState: DeepPartial<RelationViewState>) {
    }

    const baseProps: ViewElementBaseProps = {
        dashboardId:  props.dashboardId,
        typeOptions: TYPE_OPTIONS_DATA,
        startIconClass: "h-10",
        element: props.element
    }

    return <ViewElementBase {...baseProps}>
        <RelationStateView
            embedded
            relationState={props.element.data}
            updateRelationDataWithParams={updateRelationDataWithParams}
            updateRelationBaseQuery={updateRelationBaseQuery}
            updateRelationViewState={updateRelationViewState}
        />
    </ViewElementBase>
}