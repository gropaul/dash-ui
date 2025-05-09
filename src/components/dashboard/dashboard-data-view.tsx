import {RelationStateView} from "@/components/relation/relation-state-view";
import {
    executeQueryOfRelationState,
    RelationState,
    setRelationLoading,
    updateRelationQueryForParams,
    ViewQueryParameters
} from "@/model/relation-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";

export interface DashboardDataViewProps {
    relation: RelationState;
    onRelationUpdate: (relation: RelationState) => void;
}

export async function updateRelationDataWithParamsSkeleton(_relationId: string, query: ViewQueryParameters, relation: RelationState, onRelationUpdate: (relation: RelationState) => void) {

    const loadingRelationState = setRelationLoading(relation); // Set it loading
    onRelationUpdate(loadingRelationState);

    const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query); // Update the relation state
    const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
    // update state with new data and completed state
    onRelationUpdate(executedRelationState);
}

export function DashboardDataView(props: DashboardDataViewProps) {

    function updateRelationDataWithParams(_relationId: string, query: ViewQueryParameters) {
        return updateRelationDataWithParamsSkeleton(_relationId, query, props.relation, props.onRelationUpdate)
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

        // if the viewState contains the view mode, update the data
        if (viewState.selectedView) {
            updateRelationDataWithParams(_relationId, {
                ...props.relation.query.viewParameters,
                type: viewState.selectedView
            })
        }

    }

    return <RelationStateView
        embedded
        relationState={props.relation}
        updateRelationDataWithParams={updateRelationDataWithParams}
        updateRelationBaseQuery={updateRelationBaseQuery}
        updateRelationViewState={updateRelationViewState}
    />
}