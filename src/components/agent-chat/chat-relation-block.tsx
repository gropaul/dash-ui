'use client';

import {useEffect, useMemo, useState} from "react";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {useRelationModel} from "@/components/relation/use-relation-model";
import {DEFAULT_BLOCK_ROWS, GRID_ROW_PX, INPUT_ROWS, isInputView} from "@/components/page-editor/model";
import {buildRelation, RelationConfig, splitHeader} from "@/state/workspace/relation-config";
import {queryName} from "@/state/workspace/file-references";
import {normalizePath} from "@/state/workspace/paths";
import {useFile} from "@/state/workspace/workspace.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {checkReading} from "@/state/agent/read-only-sql";
import {cn} from "@/lib/utils";

/**
 * A ```sql fence of an agent's message shown as a page block would show it, and run. Its `-- input:` path is from
 * the workspace root. View changes stay in memory: the message is the agent's, there is no file to write them to.
 * `bleed` drops its margin and border, for a block filling the edge of its bubble, which rounds it.
 */
export function ChatRelationBlock({surface, text, bleed}: { surface: string, text: string, bleed?: boolean }) {
    const {header, sql} = useMemo(() => splitHeader(text), [text]);
    const inputPath = header.input ? normalizePath(header.input) : undefined;
    const inputText = useFile(inputPath ?? '');
    const input = useMemo(() => inputPath && inputText !== undefined
        ? buildRelation({id: inputPath, name: queryName(inputPath), ...splitHeader(inputText)})
        : undefined, [inputPath, inputText]);

    const config = useMemo((): RelationConfig | undefined => !inputPath || input
        ? {id: surface, name: '', sql, header}
        : undefined, [surface, sql, header, inputPath, input]);
    const model = useRelationModel(config, () => undefined, input);
    const [error, setError] = useState<string>();

    useEffect(() => {
        if (!model || model.relation.executionState.state !== 'not-started') return;
        const actions = getRelationActions({mode: 'embedded', relationState: model.relation, updateRelation: model.updateRelation});
        // The agent wrote this SQL; it runs only if it just reads. A block taking a query in has none of its own.
        (input ? Promise.resolve() : checkReading(sql.trim().replace(/;\s*$/, '')))
            .then(() => actions.updateRelationDataWithBaseQuery(model.relation.query.baseQuery))
            .catch((e) => setError(e instanceof Error ? e.message : String(e)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.relation.id]);

    const rows = isInputView(model?.relation.viewState.selectedView) ? INPUT_ROWS : Number(header.rows) || DEFAULT_BLOCK_ROWS;
    const message = error ?? (!model ? `${header.input} not found` : undefined);
    return (
        <div data-chat-block className={cn("relative overflow-hidden", bleed ? "bg-card" : "my-2 rounded-2xl")} style={{height: rows * GRID_ROW_PX}}>
            {message || !model ? (
                <div className={cn("flex h-full items-center justify-center bg-card p-3 text-sm text-destructive", !bleed && "rounded-2xl border")}>{message}</div>
            ) : (
                <RelationStateView
                    embedded
                    showBorder={!bleed}
                    neverShowQueryEditor
                    mode='embedded'
                    height='fit'
                    relationState={model.relation}
                    updateRelation={model.updateRelation}
                />
            )}
        </div>
    );
}
