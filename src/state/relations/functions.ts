import {
    executeQueryOfRelationState,
    RelationState,
    returnEmptyErrorState,
    setRelationLoading,
    updateRelationQueryForParams,
    ViewQueryParameters
} from "@/model/relation-state";
import {DefaultRelationZustandActions} from "@/state/relations.state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationViewAPIProps} from "@/components/relation/relation-view";

export type updateRelationFunction = (relation: RelationState) => void;

export interface AdvancedRelationActions extends DefaultRelationZustandActions{
    updateRelationDataWithParams: (query: ViewQueryParameters) => Promise<void>,
    updateRelationViewState: (viewState: DeepPartial<RelationViewState>) => void,
}

export function createAdvancedRelationActions(props: RelationViewAPIProps): AdvancedRelationActions {
    const {updateRelation, relationState} = props;
    return {
        updateRelation: updateRelation,
        updateRelationDataWithParams: async (query: ViewQueryParameters) => {
            return updateRelationDataWithParams(relationState, query, updateRelation, props.inputManager);
        },
        updateRelationViewState: (viewState: DeepPartial<RelationViewState>) => {
            return updateRelationViewState(relationState, viewState, updateRelation);
        },
    }
}

export async function updateRelationViewState(relation: RelationState, partialUpdate: DeepPartial<RelationViewState>, update: updateRelationFunction) {
    const currentViewState = deepClone(relation.viewState);

    // the display name may not be updated here, as it is managed outside of the view state
    if (partialUpdate.displayName !== undefined) {
        throw new Error("Display name cannot be updated via view state update, use setEntityDisplayName ");
    }

    safeDeepUpdate(currentViewState, partialUpdate); // mutate the clone, not the original
    const updatedRelation = {
        ...relation,
        viewState: currentViewState,
    };
    update(updatedRelation);

    // if the view mode has been changed, update the query params
    if (partialUpdate.selectedView) {
        const viewParameters = relation.query.viewParameters;
        const newViewParameters: ViewQueryParameters = {
            ...viewParameters,
            type: partialUpdate.selectedView
        };
        await updateRelationDataWithParams(updatedRelation, newViewParameters, update, undefined);
    }
}

export async function updateRelationDataWithParams(relation: RelationState, query: ViewQueryParameters, update: updateRelationFunction, inputManager?: InputManager) {
    console.log('Updating relation data with params:', relation.id, query);


    const loadingRelationState = setRelationLoading(relation); // Set it loading
    update(loadingRelationState);

    try {
        const updatedRelationState = await updateRelationQueryForParams(loadingRelationState, query, inputManager); // Update the relation state
        const executedRelationState = await executeQueryOfRelationState(updatedRelationState);
        // update state with new data and completed state
        update(executedRelationState);
    } catch (e) {
        // if error update with error state
        const errorState = returnEmptyErrorState(loadingRelationState, e)
        update(errorState);

    }
}