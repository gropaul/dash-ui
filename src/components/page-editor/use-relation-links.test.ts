import {beforeEach, describe, expect, it, vi} from 'vitest';
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

const {renameBlock} = await import("@/components/page-editor/use-relation-links");
const {onBlockRelationEvent} = await import("@/state/relations/sql/page-refresh");
const {createPlateEditor} = await import("platejs/react");
const {BlockSelectionPlugin} = await import("@platejs/selection/react");
const {createRelationBlock} = await import("@/components/page-editor/model");
const {buildRelation} = await import("@/state/workspace/relation-config");
const {useSurfaces} = await import("@/state/workspace/surfaces.state");
const {useWorkspace} = await import("@/state/workspace/workspace.state");

const PAGE = 'Sales.md';
const dropdown = createRelationBlock("SELECT 'North' AS region", {view: 'select', column: 'region'}, undefined, 'demo_region');
const chart = createRelationBlock("SELECT * FROM refs.demo_region()", {view: 'line'}, undefined, 'revenue');
const relationOf = (block: TRelationBlock) => buildRelation({id: `${PAGE}#${block.name}`, name: block.name!, sql: block.sql, header: block.header});

describe('linked chart blocks', () => {
    beforeEach(() => {
        executed.length = 0;
        useWorkspace.setState({files: {[PAGE]: '```sql demo_region\n-- view: select\n```\n\n```sql revenue\n-- view: line\n```'}});
        for (const block of [dropdown, chart]) useSurfaces.getState().set(relationOf(block));
    });

    it('re-runs the chart reading the dropdown', async () => {
        const relation = relationOf(dropdown);
        await onBlockRelationEvent(PAGE, {type: 'QUERY_RUN_FINISHED', old: relation, new: relation});
        expect(executed).toEqual(['revenue']);
    });

    it('leaves the blocks of other pages alone', async () => {
        const relation = relationOf(dropdown);
        await onBlockRelationEvent('Other.md', {type: 'QUERY_RUN_FINISHED', old: relation, new: relation});
        expect(executed).toEqual([]);
    });
});

describe('renaming a block', () => {
    it('renames its refs in the other blocks and keeps its pick', () => {
        const editor = createPlateEditor({plugins: [BlockSelectionPlugin], value: [structuredClone(dropdown), structuredClone(chart)]});
        const picked = {...relationOf(dropdown), queryState: {select: {selectedValues: ['North']}}};
        useSurfaces.getState().set(picked);

        renameBlock(editor, PAGE, picked.id, 'region');

        const [renamed, reader] = editor.children as TRelationBlock[];
        expect(renamed.name).toBe('region');
        expect(reader.sql).toBe('SELECT * FROM refs.region()');
        const state = useSurfaces.getState().relations[`${PAGE}#region`];
        expect(state.queryState).toEqual(picked.queryState);
        expect(state.query.viewParameters.select!.label).toBe('Region');
        expect(useSurfaces.getState().relations[picked.id]).toBeUndefined();
    });
});
