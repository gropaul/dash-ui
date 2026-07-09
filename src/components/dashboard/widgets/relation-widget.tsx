import {useCallback, useMemo} from "react";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {RelationState} from "@/model/relation-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {WidgetToolbar} from "@/components/dashboard/widgets/widget-toolbar";
import {cn} from "@/lib/utils";

interface RelationWidgetProps {
    relationId: string;
    editMode: boolean;
    compact: boolean;   // small screens: toolbar inside the widget instead of the right gutter
    onExpand: () => void;
    onRemove: () => void;
}

/**
 * Renders a relation referenced by id (never a copy). Content is display-only; in edit mode a
 * vertical floating toolbar (run / fullscreen / view-type / settings + drag & remove) sits at the
 * top-right. Configuration happens in the fullscreen host (see dashboard-tab).
 */
export function RelationWidget({relationId, editMode, compact, onExpand, onRemove}: RelationWidgetProps) {
    // Fall back to a default while a referenced relation is missing (orphan/during load).
    const relation = useRelationsState(
        s => s.relations[relationId] ?? RelationActions.create(),
        shallow,
    );
    const storeUpdateRelation = useRelationsState(s => s.updateRelation);

    const updateRelation = useCallback((newRelation: RelationState) => {
        if (!useRelationsState.getState().relations[relationId]) return;
        storeUpdateRelation(newRelation);
    }, [relationId, storeUpdateRelation]);

    const actions = useMemo(
        () => getRelationActions({mode: 'embedded', relationState: relation, updateRelation}),
        [relation, updateRelation],
    );

    return (
        <div className="relative w-full h-full group/widget">
            <div className={cn("w-full h-full overflow-hidden bg-card rounded-2xl")}>
                <RelationStateView
                    embedded
                    showBorder
                    neverShowQueryEditor
                    mode='embedded'
                    height='fit'
                    relationState={relation}
                    updateRelation={updateRelation}
                />
            </div>
            <WidgetToolbar
                className={cn(
                    "absolute top-0 z-[100] opacity-0 transition-opacity group-hover/widget:opacity-100",
                    compact ? "right-0" : "left-full",
                )}
                compact={compact}
                draggable={editMode}
                runState={relation.executionState}
                onRun={() => actions.updateRelationDataWithBaseQuery(relation.query.baseQuery)}
                onStopRun={actions.cancelQuery}
                onFullscreen={onExpand}
                onRemove={editMode ? onRemove : undefined}
            />
        </div>
    );
}
