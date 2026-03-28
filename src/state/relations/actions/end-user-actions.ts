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
    toggleShowHeader: () => void,
    toggleShowParameters: () => void,
    // set view type
    setRelationViewType: (view: RelationViewType) => void,
    // show chart settings
    showChartSettings: (show: boolean) => void,

    // set display name
    setDisplayName: (name: string) => void,
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
        toggleShowHeader: () => {
            const current = relationState.viewState.showHeader;
            advancedActions.updateRelationViewState({
                showHeader: !current,
            });
        },
        toggleShowParameters: () => {
            const current = relationState.viewState.parametersState.panelState.show;
            advancedActions.updateRelationViewState({
                parametersState: {
                    panelState: {
                        show: !current,
                    }
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
        },
        setDisplayName: (name: string) => {
            advancedActions.updateRelationViewState({
                displayName: name,
            });
        }
    }
}