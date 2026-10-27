/**
 * A canvas file (`.canvas`): one `<node id="…" type="…" x="…" y="…" width="…" height="…">` section per canvas node.
 * A `query` node holds a ```sql block, named and read as on a page; a `text` node its text; a `link` node its label;
 * a `drawing` node its stroke points as JSON. Settings of a node beyond its place and size are further attributes.
 */

export type CanvasNodeType = 'query' | 'text' | 'link' | 'drawing';

export interface CanvasNodeText {
    id: string;
    type: CanvasNodeType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    /** The other attributes, as written. */
    attributes: Record<string, string>;
    body: string;
}

const NODE = /<node\b([^>]*)>\n*([\s\S]*?)\n*<\/node>/g;
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g;
const PLACE = new Set(['id', 'type', 'x', 'y', 'width', 'height']);

export function canvasNodes(text: string): CanvasNodeText[] {
    return [...text.matchAll(NODE)].map(([, rawAttributes, body], index) => {
        const all = Object.fromEntries([...rawAttributes.matchAll(ATTRIBUTE)].map(([, key, value]) => [key, unescape(value)]));
        const number = (key: string) => all[key] === undefined ? undefined : Number(all[key]) || 0;
        const attributes = Object.fromEntries(Object.entries(all).filter(([key]) => !PLACE.has(key)));
        const type = all.type === 'text' || all.type === 'link' || all.type === 'drawing' ? all.type : 'query';
        return {
            id: all.id || `node-${index}`, type, x: number('x') ?? 0, y: number('y') ?? 0,
            width: number('width'), height: number('height'), attributes, body,
        };
    });
}

export function formatCanvas(nodes: CanvasNodeText[]): string {
    return nodes.map(formatNode).join('\n\n') + '\n';
}

function formatNode({id, type, x, y, width, height, attributes, body}: CanvasNodeText): string {
    const place: [string, string | number | undefined][] = [['id', id], ['type', type], ['x', x], ['y', y], ['width', width], ['height', height]];
    const all = [...place, ...Object.entries(attributes)]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${typeof value === 'number' ? Math.round(value) : escape(value!)}"`);
    return `<node ${all.join(' ')}>\n\n${body.trim()}\n\n</node>`;
}

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const unescape = (value: string) => value.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
