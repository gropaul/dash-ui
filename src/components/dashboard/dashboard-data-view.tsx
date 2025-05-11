import {RelationStateView} from "@/components/relation/relation-state-view";
import {
    executeQueryOfRelationState,
    RelationState,
    returnEmptyErrorState,
    setRelationLoading,
    updateRelationQueryForParams,
    ViewQueryParameters
} from "@/model/relation-state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {InputManager} from "@/components/editor/inputs/input-manager";

export interface DashboardDataViewProps {
    relation: RelationState;
    inputManager: InputManager;
    onRelationUpdate: (relation: RelationState) => void;
}

export async function updateRelationDataWithParamsSkeleton(_relationId: string, query: ViewQueryParameters, relation: RelationState, onRelationUpdate: (relation: RelationState) => void, inputManager?: InputManager) {

    const loadingRelationState = setRelationLoading(relation); // Set it loading
    onRelationUpdate(loadingRelationState);

    try {
        const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query, undefined, inputManager); // Update the relation state
        const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
        // update state with new data and completed state
        onRelationUpdate(executedRelationState);
    } catch (e) {
        // if error update with error state
        const errorState = returnEmptyErrorState(loadingRelationState, e)
        onRelationUpdate(errorState);
    }
}

export function DashboardDataView(props: DashboardDataViewProps) {

    function updateRelationDataWithParams(_relationId: string, query: ViewQueryParameters) {
        return updateRelationDataWithParamsSkeleton(_relationId, query, props.relation, props.onRelationUpdate, props.inputManager)
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
        inputManager={props.inputManager}
        updateRelationDataWithParams={updateRelationDataWithParams}
        updateRelationBaseQuery={updateRelationBaseQuery}
        updateRelationViewState={updateRelationViewState}
    />
}