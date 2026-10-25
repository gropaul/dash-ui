import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createSlateEditor} from "platejs";
import {RelationState} from "@/model/relation-state";
import type {TRelationBlock} from "@/components/page-editor/model";

const {executed} = vi.hoisted(() => ({executed: [] as string[]}));

vi.mock("@/state/connections/connections-service", () => ({
    ConnectionsService: {getInstance: () => ({executeQuery: async () => [], onDatabaseConnectionChange: () => () => undefined})},
}));
vi.mock("@/model/relation-state", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    executeQueryOfRelation: vi.fn(async (r: RelationState) => {
        executed.push(r.viewState.displayName);
        return {...r, executionState: {state: 'success'}};
    }),
}));

const {onBlockRelationEvent, renameBlock} = await import("@/components/page-editor/use-relation-links");
const {createPlateEditor} = await import("platejs/react");
const {BlockSelectionPlugin} = await import("@platejs/selection/react");
const {buildBlockRelation, useBlockRelations} = await import("@/components/page-editor/block-relation");
const {createRelationBlock} = await import("@/components/page-editor/model");

const dropdown = createRelationBlock("SELECT 'North' AS region", {view: 'select', column: 'region'}, undefined, 'demo_region');
const chart = createRelationBlock("SELECT * FROM refs.demo_region()", {view: 'line'}, undefined, 'revenue');

describe('linked chart blocks', () => {
    beforeEach(() => {
        executed.length = 0;
        for (const block of [dropdown, chart]) useBlockRelations.getState().setRelation(buildBlockRelation(block));
    });

    it('re-runs the chart reading the dropdown', async () => {
        const editor = createSlateEditor({value: [dropdown, chart]});
        const relation = buildBlockRelation(dropdown);

        await onBlockRelationEvent(editor, {type: 'QUERY_RUN_FINISHED', old: relation, new: relation});

        expect(executed).toEqual(['revenue']);
    });
});

describe('renaming a block', () => {
    it('renames its refs in the other blocks and keeps its pick', () => {
        const editor = createPlateEditor({plugins: [BlockSelectionPlugin], value: [structuredClone(dropdown), structuredClone(chart)]});
        const picked = {...buildBlockRelation(dropdown), queryState: {select: {selectedValues: ['North']}}};
        useBlockRelations.getState().setRelation(picked);

        renameBlock(editor, picked.id, 'region', true);

        const [renamed, reader] = editor.children as TRelationBlock[];
        expect(renamed.name).toBe('region');
        expect(reader.sql).toBe('SELECT * FROM refs.region()');
        const state = useBlockRelations.getState().relations[buildBlockRelation(renamed).id];
        expect(state.queryState).toEqual(picked.queryState);
        expect(state.query.viewParameters.select!.label).toBe('Region');
    });
});
