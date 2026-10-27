'use client';

import React from "react";
import {TElement} from "platejs";
import {useEditorRef} from "platejs/react";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {RelationView} from "@/components/relation/relation-view";
import {useBlockRelation} from "@/components/page-editor/block-relation";
import {useBlockFullscreen} from "@/components/page-editor/block-fullscreen";

/** A block's relation in the full view, in a dialog; its changes go into the block's fence as they are made. */
export function RelationFullscreenDialog() {
    const editor = useEditorRef();
    const blockId = useBlockFullscreen(s => s.blockId);
    const element = blockId ? editor.api.node<TElement>({id: blockId, at: []})?.[0] : undefined;
    const close = () => useBlockFullscreen.getState().open(null);

    return (
        <Dialog open={!!element} onOpenChange={open => !open && close()}>
            <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0">
                {element && <FullscreenBlock element={element}/>}
            </DialogContent>
        </Dialog>
    );
}

function FullscreenBlock({element}: { element: TElement }) {
    const linked = useBlockRelation(element);
    if (!linked) return null;
    return (
        <>
            <DialogTitle className="sr-only">{linked.relation.viewState.displayName}</DialogTitle>
            <div className="min-h-0 flex-1">
                <RelationView mode='fullscreen' height='fit' relationState={linked.relation} updateRelation={linked.updateRelation}/>
            </div>
        </>
    );
}
