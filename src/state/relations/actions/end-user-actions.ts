import {useRelationsState} from "@/state/relations.state";
import {
    getDefaultSessionState,
    RelationSessionState,
    RelationViewMode, RelationViewType,
} from "@/model/relation-view-state";
import {RelationViewAPIProps} from "@/components/relation/relation-view";
import {AdvancedRelationActions, createAdvancedRelationActions} from "@/state/relations/actions/advanced-actions";
import {DeepPartial} from "@/platform/object-utils";

export interface EndUserRelationActions extends AdvancedRelationActions {
    toggleShowHeader: () => void,
    toggleShowParameters: () => void,
    setRelationViewType: (view: RelationViewType) => void,
    setDisplayName: (name: string, path?: string[]) => void,
    /** Resolves the session state for the given rendering mode, falling back to mode-appropriate defaults. */
    getSessionState: (mode: RelationViewMode) => RelationSessionState,
    /** Merges a partial update into the session state for the given rendering mode. */
    updateSessionState: (mode: RelationViewMode, update: DeepPartial<RelationSessionState>) => void,
}

export function getRelationActions(props: RelationViewAPIProps): EndUserRelationActions {
    const advancedActions = createAdvancedRelationActions(props);
    const {relationState} = props;

    function getSessionState(mode: RelationViewMode): RelationSessionState {
        const key = mode === 'fullscreen' ? 'fullscreenSessionState' : 'embeddedSessionState';
        const state = relationState.viewState[key] ?? getDefaultSessionState(mode);
        return {
            ...getDefaultSessionState(mode),
            ...state,
        }
    }

    function updateSessionState(mode: RelationViewMode, update: DeepPartial<RelationSessionState>) {
        const key = mode === 'fullscreen' ? 'fullscreenSessionState' : 'embeddedSessionState';
        console.log(`Updating session state for mode ${mode} with update`, update);
        advancedActions.updateRelationViewState({[key]: update} as any);
    }

    return {
        ...advancedActions,
        getSessionState,
        updateSessionState,
        toggleShowHeader: () => {
            const current = relationState.viewState.showHeader;
            advancedActions.updateRelationViewState({showHeader: !current});
        },
        toggleShowParameters: () => {
            const current = relationState.viewState.parametersState.panelState.show;
            advancedActions.updateRelationViewState({
                parametersState: {panelState: {show: !current}},
            });
        },
        setRelationViewType: (view: RelationViewType) => {
            advancedActions.updateRelationViewState({selectedView: view});
        },
        setDisplayName: (name: string, path: string[] = []) => {
            advancedActions.updateRelationViewState({displayName: name});
            try {
                useRelationsState.getState().setEntityDisplayName('relations', relationState.id, name, path);
            } catch (e) {
                console.info("Failed to set display name in entity collection. this may be fine if this is a canvas node", e);
            }
        }
    }
}
