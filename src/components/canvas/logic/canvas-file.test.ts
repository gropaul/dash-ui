import {describe, expect, it} from 'vitest';
import {Node} from '@xyflow/react';
import {blockBody, blockOf} from "@/components/canvas/logic/canvas-file";

const nodeWith = (body: string) => ({id: 'n', position: {x: 0, y: 0}, type: 'relationNode', data: {body, showCode: true}}) as Node;

describe('query node blocks', () => {
    it('read back the SQL exactly as written, so the editor is not reset', () => {
        for (const sql of ['SELECT 1', 'SELECT 1\n', 'SELECT 1\n\n', '']) {
            const body = blockBody('q', {view: 'table'}, sql);
            expect(blockOf(nodeWith(body))).toEqual({name: 'q', header: {view: 'table'}, sql});
        }
    });
});
