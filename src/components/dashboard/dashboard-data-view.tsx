import {RelationStateView} from "@/components/relation/relation-state-view";
import {
    executeQueryOfRelationState,
    TableViewQueryParameters,
    RelationState,
    setRelationLoading,
    updateRelationQueryForParams, ViewQueryParameters
} from "@/model/relation-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";

export interface DashboardDataViewProps {
    relation: RelationState;
    onRelationUpdate: (relation: RelationState) => void;
}

export function DashboardDataView(props: DashboardDataViewProps) {
    async function updateRelationDataWithParams(_relationId: string, query: ViewQueryParameters) {

        const relation = props.relation;
        const loadingRelationState = setRelationLoading(relation); // Set it loading
        props.onRelationUpdate(loadingRelationState);

        const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query); // Update the relation state
        const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
        // update state with new data and completed state
        props.onRelationUpdate(executedRelationState);

    }

    function updateRelationBaseQuery(_relationId: string, baseQuery: string) {
        props.onRelationUpdate({
            ...props.relation,
            query: {
                ...props.relation.query,
                baseQuery: baseQuery
            }
        })

    }

    function updateRelationViewState(_relationId: string, viewState: DeepPartial<RelationViewState>) {
        const currentViewState = deepClone(props.relation.viewState);
        safeDeepUpdate(currentViewState, viewState);

        props.onRelationUpdate({
            ...props.relation,
            viewState: currentViewState
        })

    }

    return <RelationStateView
        embedded
        relationState={props.relation}
        updateRelationDataWithParams={updateRelationDataWithParams}
        updateRelationBaseQuery={updateRelationBaseQuery}
        updateRelationViewState={updateRelationViewState}
    />
}