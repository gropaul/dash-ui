import {
    executeQueryOfRelation,
    RelationState,
    resetQueryParams,
    returnEmptyErrorState,
    setRelationLoading,
    ViewQueryParameters
} from "@/model/relation-state";
import {DefaultRelationZustandActions} from "@/state/relations.state";
import {deepClone, DeepPartial, safeDeepUpdate} from "@/platform/object-utils";
import {RelationViewState, RelationViewType} from "@/model/relation-view-state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {RelationViewAPIProps} from "@/components/relation/relation-view";
import {ConnectionsService} from "@/state/connections/connections-service";
import {toast} from "sonner";
import {processRelationUpdateEvent} from "@/state/relations/event/relation-event-update-dispatch";
import {AdvancedRelationActions, createAdvancedRelationActions} from "@/state/relations/actions/advanced-actions";

export interface EndUserRelationActions extends AdvancedRelationActions {
    // toggle show code
    toggleShowCode: () => void,
    // set view type
    setRelationViewType: (view: RelationViewType) => void,
    // show chart settings
    showChartSettings: (show: boolean) => void,
}

export function getRelationActions(props: RelationViewAPIProps): EndUserRelationActions {
    const advancedActions = createAdvancedRelationActions(props);
    const {relationState} = props;

    return {
        ...advancedActions,
        toggleShowCode: () => {
            const current = relationState.viewState.codeFenceState.show;
            advancedActions.updateRelationViewState({
                codeFenceState: {
                    show: !current,
                },
            });
        },
        setRelationViewType: (view: RelationViewType) => {
            advancedActions.updateRelationViewState({
                selectedView: view,
            });
        },
        showChartSettings(show: boolean) {
            advancedActions.updateRelationViewState({
                chartState: {
                    view: {
                        showConfig: show,
                    }
                }
            });
        }
    }
}