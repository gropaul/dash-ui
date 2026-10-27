import {Edge, Node} from '@xyflow/react';
import {useCallback, useMemo} from 'react';
import {RelationModel, useRelationModel} from "@/components/relation/use-relation-model";
import {CanvasNodeText, canvasNodes, formatCanvas} from "@/state/workspace/canvas-text";
import {sqlFences} from "@/state/workspace/page-text";
import {joinHeader, splitHeader} from "@/state/workspace/header-lines";
import {StrokePoint} from "@/components/canvas/logic/models";
import {DEFAULT_LINK_NODE_DATA, DEFAULT_TEXT_NODE_DATA, LinkNodeData, TextNodeData} from "@/components/canvas/nodes/node-data";
import {FreeDrawNodeData} from "@/components/canvas/nodes/free-draw-node";
import {createAutoEdge, extractNodeRefs} from "@/components/canvas/logic/ref-detection";

/** A query node's data: its ```sql block as the file has it, and whether the node shows its SQL. */
export interface RelationNodeData extends Record<string, unknown> {
    body: string;
    showCode: boolean;
}

// The text node's settings, by their attribute in the file.
const TEXT_ATTRIBUTES: [keyof TextNodeData, string][] = [
    ['textStyle', 'text-style'], ['fontStyle', 'font-style'], ['textAlign', 'text-align'],
    ['verticalAlign', 'vertical-align'], ['color', 'color'],
];

/** The nodes of a canvas file as React Flow nodes, keeping which of `previous` were selected. */
export function readCanvas(text: string, previous: Node[]): Node[] {
    const selected = new Set(previous.filter(n => n.selected).map(n => n.id));
    return canvasNodes(text).map(node => ({
        id: node.id,
        position: {x: node.x, y: node.y},
        width: node.width,
        height: node.height,
        selected: selected.has(node.id),
        ...typeAndData(node),
    }));
}

function typeAndData(node: CanvasNodeText): Pick<Node, 'type' | 'data'> {
    const {attributes, body} = node;
    switch (node.type) {
        case 'text': {
            const data: Record<string, unknown> = {...DEFAULT_TEXT_NODE_DATA, text: body};
            for (const [key, attribute] of TEXT_ATTRIBUTES) {
                if (attributes[attribute] !== undefined) data[key] = attributes[attribute];
            }
            return {type: 'textNode', data};
        }
        case 'link': {
            const data: LinkNodeData = {
                label: body,
                href: attributes.href ?? DEFAULT_LINK_NODE_DATA.href,
                variant: attributes.variant === 'outline' ? 'outline' : 'primary',
            };
            return {type: 'linkNode', data: {...data}};
        }
        case 'drawing': {
            const data: FreeDrawNodeData = {
                points: parsePoints(body),
                color: attributes.color ?? '#000000',
                strokeSize: Number(attributes.size ?? 4),
                opacity: Number(attributes.opacity ?? 1),
            };
            return {type: 'freeDrawNode', data: data as unknown as Record<string, unknown>};
        }
        default:
            return {type: 'relationNode', data: {body, showCode: attributes.code !== 'hidden'} satisfies RelationNodeData};
    }
}

function parsePoints(body: string): StrokePoint[] {
    try {
        return JSON.parse(body);
    } catch {
        return [];
    }
}

/** The canvas file of `nodes`. */
export function writeCanvas(nodes: Node[]): string {
    return formatCanvas(nodes.flatMap((node): CanvasNodeText[] => {
        const place = {id: node.id, x: node.position.x, y: node.position.y, width: node.width, height: node.height};
        switch (node.type) {
            case 'textNode': {
                const data = {...DEFAULT_TEXT_NODE_DATA, ...(node.data as Partial<TextNodeData>)};
                const attributes = Object.fromEntries(TEXT_ATTRIBUTES
                    .filter(([key]) => data[key] !== DEFAULT_TEXT_NODE_DATA[key])
                    .map(([key, attribute]) => [attribute, String(data[key])]));
                return [{...place, type: 'text' as const, attributes, body: data.text}];
            }
            case 'linkNode': {
                const data = {...DEFAULT_LINK_NODE_DATA, ...(node.data as Partial<LinkNodeData>)};
                const attributes: Record<string, string> = {href: data.href};
                if (data.variant !== 'primary') attributes.variant = data.variant;
                return [{...place, type: 'link' as const, attributes, body: data.label}];
            }
            case 'freeDrawNode': {
                const data = node.data as unknown as FreeDrawNodeData;
                const points = data.points.map(([x, y, pressure]) => [round(x, 1), round(y, 1), round(pressure, 2)]);
                const attributes = {color: data.color, size: String(data.strokeSize), opacity: String(data.opacity)};
                return [{...place, type: 'drawing' as const, attributes, body: JSON.stringify(points)}];
            }
            case 'relationNode':
            case 'chartNode': {
                const data = node.data as RelationNodeData;
                return [{...place, type: 'query' as const, attributes: data.showCode ? {} : {code: 'hidden'}, body: data.body}];
            }
            default:
                return [];
        }
    }));
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/** The name, header lines and SQL of a ```sql block. */
function parseBlock(body: string): { name?: string, header: Record<string, string>, sql: string } {
    const fence = sqlFences(body)[0];
    // The line break before the closing fence is the fence's, which blockBody writes back.
    return {name: fence?.name, ...splitHeader((fence?.body ?? '').replace(/\n$/, ''))};
}

/** A query node's block. */
export const blockOf = (node: Node) => parseBlock((node.data as RelationNodeData).body ?? '');

/** The name of a query node's block: what `refs.<name>()` calls it by. */
export const blockNameOf = (node: Node) => blockOf(node).name;

export function blockBody(name: string, header: Record<string, string>, sql: string): string {
    return `\`\`\`sql ${name}\n${joinHeader(header, sql)}\n\`\`\``;
}

export const isRelationNode = (node: Node) => node.type === 'relationNode' || node.type === 'chartNode';

/** A block name no query node of `nodes` has yet: `query_1`, `query_2`, … */
export function freeBlockName(nodes: Node[], base = 'query'): string {
    const taken = new Set(nodes.filter(isRelationNode).map(n => blockNameOf(n)?.toLowerCase()));
    let i = 1;
    while (taken.has(`${base}_${i}`)) i++;
    return `${base}_${i}`;
}

/** An edge from each query node to every query node reading it through `refs.<name>()`. */
export function refEdges(nodes: Node[]): Edge[] {
    const byName = new Map<string, string>();
    for (const node of nodes.filter(isRelationNode)) {
        const name = blockNameOf(node);
        if (name) byName.set(name.toLowerCase(), node.id);
    }
    return nodes.filter(isRelationNode).flatMap(node => extractNodeRefs(blockOf(node).sql).flatMap(ref => {
        const source = byName.get(ref.toLowerCase());
        return source && source !== node.id ? [createAutoEdge(source, node.id)] : [];
    }));
}

/**
 * The relation of the query node `nodeId`, whose block is `body`: run and read as a block of a page, keyed
 * `<canvas path>#<name>`. Changes to its SQL or setup are written into the node's block.
 */
export function useRelationNodeModel(
    path: string,
    nodeId: string,
    body: string,
    setNodes: (updater: (nodes: Node[]) => Node[]) => void,
): RelationModel | undefined {
    const block = useMemo(() => parseBlock(body), [body]);
    const config = useMemo(() => ({
        id: `${path}#${block.name ?? nodeId}`, name: block.name ?? '', sql: block.sql, header: block.header,
    }), [path, block, nodeId]);
    const write = useCallback((sql: string, header: Record<string, string>) => {
        setNodes((nodes) => nodes.map((node) => node.id !== nodeId ? node
            : {...node, data: {...node.data, body: blockBody(block.name ?? '', header, sql)}}));
    }, [setNodes, nodeId, block.name]);
    return useRelationModel(config, write);
}
