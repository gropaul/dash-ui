import {describe, expect, it} from 'vitest';
import {canvasNodes, CanvasNodeText, formatCanvas} from "@/state/workspace/canvas-text";
import {sqlFences} from "@/state/workspace/page-text";

const block = '```sql stations\n-- view: select\nSELECT 1 AS StationName\n```';
const nodes: CanvasNodeText[] = [
    {id: 'title', type: 'text', x: 0, y: 0, width: 400, height: 80, attributes: {'text-style': 'h1', color: '#"&'}, body: 'Trains'},
    {id: 'n1', type: 'query', x: 20, y: 120, width: 560, height: 140, attributes: {}, body: block},
    {id: 'fd-1', type: 'drawing', x: 5, y: 6, width: undefined, height: undefined, attributes: {size: '4'}, body: '[[0,0,0.5],[1,2,0.5]]'},
];

describe('canvas text', () => {
    it('reads back what it writes', () => {
        expect(canvasNodes(formatCanvas(nodes))).toEqual(nodes);
    });

    it('keeps the sql fences readable as on a page', () => {
        expect(sqlFences(formatCanvas(nodes)).map(f => f.name)).toEqual(['stations']);
    });

    it('reads a node without a type as a query', () => {
        expect(canvasNodes('<node x="1" y="2">\n\nx\n\n</node>')[0]).toMatchObject({id: 'node-0', type: 'query', x: 1, y: 2, body: 'x'});
    });
});
