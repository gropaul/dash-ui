import {
    executeQueryOfRelation,
    RelationState, resetQueryParams,
    returnEmptyErrorState,
    setRelationLoading,
    ViewQueryParameters
} from "@/model/relation-state";
import {DefaultRelationZustandActions} from "@/state/relations.state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState} from "@/model/relation-view-state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationViewAPIProps} from "@/components/relation/relation-view";

export type updateRelationFunction = (relation: RelationState) => void;

export interface AdvancedRelationActions extends DefaultRelationZustandActions {
    // Updates the relation data based on new query parameters. If the baseQuery changes, it should be provided.
    // here
    updateRelationDataWithParams: (query: ViewQueryParameters) => Promise<void>,
    // This will reset the query parameters to default and re-run the base query, which might have changed
    // between this and the last call
    updateRelationDataWithBaseQuery: (baseQuery: string) => Promise<void>,
    // Deleting elements from an object does not work with partial updates, use updateRelation directly for that
    updateRelationViewState: (viewState: DeepPartial<RelationViewState>) => void,
}

export function createAdvancedRelationActions(props: RelationViewAPIProps): AdvancedRelationActions {
    const {updateRelation, relationState} = props;
    return {
        updateRelation: updateRelation,
        updateRelationDataWithBaseQuery: async (baseQuery: string) => {
            const newViewParams = resetQueryParams(relationState.query);
            // todo: Here we need to update the relationState to contain the new base query and new params
        },
        updateRelationDataWithParams: async (query: ViewQueryParameters) => {
            return updateAndExecuteRelation(relationState, query, updateRelation, props.inputManager);
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
        await updateAndExecuteRelation(updatedRelation, newViewParameters, update, undefined);
    }
}

export async function updateAndExecuteRelation(relation: RelationState, viewQueryParameters: ViewQueryParameters, update: updateRelationFunction, inputManager?: InputManager) {

    const loadingRelationState = setRelationLoading(relation); // Set it loading
    update(loadingRelationState);

    try {
        const updatedRelationState = {...relation}
        relation.query.viewParameters = viewQueryParameters;
        const executedRelationState = await executeQueryOfRelation(updatedRelationState, inputManager);
        // update state with new data and completed state
        update(executedRelationState);
    } catch (e) {
        // if error update with error state
        const errorState = returnEmptyErrorState(loadingRelationState, e)
        update(errorState);

    }
}