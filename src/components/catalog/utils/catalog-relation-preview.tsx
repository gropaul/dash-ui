'use client';

import React, {useEffect, useState} from "react";
import {Loader2} from "lucide-react";
import {RelationState} from "@/model/relation-state";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationView} from "@/components/relation/relation-view";
import {CatalogObject, sourceForObject} from "@/components/catalog/catalog-model";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {DetailMode} from "@/components/catalog/detail/catalog-detail-shell";

/**
 * A live table preview for the catalog detail. Builds an ephemeral relation from the object's
 * table source and renders it with {@link RelationView}. The relation lives only in this
 * component's state — it is never added to the canvas/workspace store — so browsing the catalog
 * leaves no trace. `updateRelation` is the local setter, so RelationView's own interactions
 * (paging, view switch, …) work against this local copy.
 */
export function CatalogRelationPreview({object, mode}: { object: CatalogObject, mode: DetailMode}) {
    const [relation, setRelation] = useState<RelationState | null>(null);

    // (Re)build and run whenever the target object changes.
    useEffect(() => {
        let cancelled = false;
        const initial = RelationActions.create({
            connectionId: object.connectionId,
            source: sourceForObject(object),
        });
        initial.viewState.tableState.showIndexColumn = mode === 'full'
        setRelation(initial);
        const actions = getRelationActions({
            mode: 'embedded',
            relationState: initial,
            updateRelation: (r) => { if (!cancelled) setRelation(r); },
        });
        void actions.updateRelationDataWithBaseQuery(initial.query.baseQuery);
        return () => { cancelled = true; };
    }, [object.id]);

    if (!relation) {
        return (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Loader2 size={16} className="animate-spin"/>
            </div>
        );
    }

    return (
        <div className={'relative w-full h-full'}>
            <RelationStateView
                showBorder
                neverShowQueryEditor
                mode="embedded"
                embedded
                height="fit"
                showHeader={false}
                relationState={relation}
                updateRelation={setRelation}
            />
        </div>
    );
}
