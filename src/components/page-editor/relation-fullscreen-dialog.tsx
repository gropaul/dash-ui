'use client';

import React from "react";
import {useEditorRef} from "platejs/react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {RelationView} from "@/components/relation/relation-view";
import {useRelationsState} from "@/state/relations.state";
import {headerFromRelation, inputOf, useBlockRelations} from "@/components/page-editor/block-relation";
import {TRelationBlock} from "@/components/page-editor/model";

/**
 * The relation page's fullscreen view, in a dialog. A reference block's relation saves itself; an inline
 * block's query and settings go back into its fence on close.
 */
export function RelationFullscreenDialog() {
    const editor = useEditorRef();
    const fullscreen = useBlockRelations(s => s.fullscreen);
    const referenced = useRelationsState(s => fullscreen ? s.relations[fullscreen.relationId] : undefined);
    const inline = useBlockRelations(s => fullscreen ? s.relations[fullscreen.relationId] : undefined);
    const relation = referenced ?? inline;
    const updateRelation = useRelationsState(s => s.updateRelation);
    const setRelation = useBlockRelations(s => s.setRelation);

    const close = () => {
        const {relations, setFullscreen} = useBlockRelations.getState();
        setFullscreen(null);
        const edited = fullscreen && !referenced && relations[fullscreen.relationId];
        const block = fullscreen && editor.api.node<TRelationBlock>({id: fullscreen.blockId, at: []});
        if (!edited || !block) return;
        const [node, path] = block;
        // A block taking a query in keeps the query's SQL; only its view goes into the fence.
        const input = inputOf(editor, node);
        const sql = input ? node.sql : edited.query.baseQuery;
        const header = headerFromRelation(edited, node.header, edited.query.baseQuery, input);
        if (sql !== node.sql || JSON.stringify(header) !== JSON.stringify(node.header)) {
            editor.tf.setNodes<TRelationBlock>({sql, header}, {at: path});
        }
    };

    return (
        <Dialog open={!!relation} onOpenChange={open => !open && close()}>
            <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0">
                <DialogTitle className="sr-only">{relation?.viewState.displayName}</DialogTitle>
                {relation && (
                    <div className="min-h-0 flex-1">
                        <RelationView
                            mode='fullscreen'
                            height='fit'
                            relationState={relation}
                            updateRelation={referenced ? updateRelation : setRelation}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
