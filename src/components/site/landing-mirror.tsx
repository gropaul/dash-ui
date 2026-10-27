import {CSSProperties} from "react";
import {ExternalLink} from "lucide-react";
import {canvasNodes, CanvasNodeText} from "@/state/workspace/canvas-text";
import {sqlFences} from "@/state/workspace/page-text";
import {splitHeader} from "@/state/workspace/header-lines";
import {RelationData} from "@/model/relation";
import {buttonVariants} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {TEXT_STYLES, TextStyle} from "@/components/canvas/nodes/node-data";
import {LANDING_CANVAS} from "@/components/site/landing";

// As the canvas fits its nodes into view: 10% padding, never above 100% zoom.
const FIT_PADDING = 1.1;
const TABLE_ROWS = 8;

/**
 * The canvas drawn as plain HTML from its file and snapshot, at the size the live canvas will fit it to: what
 * shows before the canvas has loaded, and what a crawler reads. On a phone the text and links stack instead.
 */
export function LandingMirror({text, data}: { text: string, data: Record<string, RelationData> }) {
    const nodes = canvasNodes(text);
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const width = Math.max(...nodes.map(n => n.x + (n.width ?? 0))) - minX;
    const height = Math.max(...nodes.map(n => n.y + (n.height ?? 0))) - minY;

    return (
        <div className="landing-mirror" style={{
            width: `min(calc(100cqw / ${FIT_PADDING}), calc(100cqh / ${FIT_PADDING} * ${width / height}), ${width}px)`,
            aspectRatio: `${width} / ${height}`,
            '--canvas-width': width,
        } as CSSProperties}>
            {nodes.map(node => (
                <div key={node.id}
                     className={cn("landing-mirror-node", node.type === 'query' && "landing-mirror-query")}
                     style={{
                         '--x': (node.x - minX) / width * 100,
                         '--y': (node.y - minY) / height * 100,
                         '--w': (node.width ?? 0) / width * 100,
                         '--h': (node.height ?? 0) / height * 100,
                     } as CSSProperties}>
                    <MirrorNode node={node} data={data}/>
                </div>
            ))}
        </div>
    );
}

function MirrorNode({node, data}: { node: CanvasNodeText, data: Record<string, RelationData> }) {
    const {attributes, body} = node;
    switch (node.type) {
        case 'text': {
            const style = TEXT_STYLES[(attributes['text-style'] ?? 'body') as TextStyle] ?? TEXT_STYLES.body;
            const Tag = attributes['text-style'] === 'h1' ? 'h1' : 'p';
            return (
                <Tag className="landing-mirror-text"
                     style={{'--size': style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, textAlign: attributes['text-align'] as CSSProperties['textAlign']} as CSSProperties}>
                    {body}
                </Tag>
            );
        }
        case 'link':
            return (
                <a href={attributes.href} target="_blank" rel="noopener noreferrer"
                   className={cn(buttonVariants({variant: attributes.variant === 'outline' ? 'outline' : 'default', size: 'lg'}), "landing-mirror-link h-full w-full gap-2 rounded-xl")}>
                    {body}
                    <ExternalLink className="h-4 w-4 opacity-70"/>
                </a>
            );
        case 'query':
            return <MirrorQuery node={node} data={data}/>;
        default:
            return null;
    }
}

function MirrorQuery({node, data}: { node: CanvasNodeText, data: Record<string, RelationData> }) {
    const fence = sqlFences(node.body)[0];
    const {header, sql} = splitHeader((fence?.body ?? '').replace(/\n$/, ''));
    const result = fence?.name ? data[`${LANDING_CANVAS}#${fence.name}`] : undefined;
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[calc(var(--px)*16)] border bg-background shadow-[var(--node-shadow)]">
            <div className="flex h-[calc(var(--px)*40)] shrink-0 items-center border-b px-[calc(var(--px)*12)] text-[length:calc(var(--px)*14)] font-medium">
                {fence?.name}
            </div>
            {node.attributes.code !== 'hidden' && (
                <pre className="h-[calc(var(--px)*170)] shrink-0 overflow-hidden border-b px-[calc(var(--px)*16)] py-[calc(var(--px)*12)] font-mono text-[length:calc(var(--px)*12)] leading-[1.45]">
                    {sql}
                </pre>
            )}
            <div className="min-h-0 flex-1 p-[calc(var(--px)*12)] text-[length:calc(var(--px)*13)]">
                {result && <MirrorResult view={header.view ?? 'table'} header={header} result={result}/>}
            </div>
        </div>
    );
}

function MirrorResult({view, header, result}: { view: string, header: Record<string, string>, result: RelationData }) {
    const column = (name?: string) => Math.max(0, result.columns.findIndex(c => c.name === name));
    switch (view) {
        case 'select':
            return <div className="rounded-md border px-[calc(var(--px)*12)] py-[calc(var(--px)*8)] text-muted-foreground">Select...</div>;
        case 'text':
            return (
                <div className="flex h-full flex-col items-center justify-center gap-[calc(var(--px)*4)] text-center">
                    <span className="text-muted-foreground">{String(result.rows[0]?.[1] ?? '')}</span>
                    <span className="text-[length:calc(var(--px)*36)] font-bold">{String(result.rows[0]?.[0] ?? '')}</span>
                </div>
            );
        case 'table':
            return (
                <table className="w-full font-mono">
                    <thead>
                    <tr className="border-b text-left">{result.columns.map(c => <th key={c.name} className="py-[calc(var(--px)*6)] font-medium">{c.name}</th>)}</tr>
                    </thead>
                    <tbody>
                    {result.rows.slice(0, TABLE_ROWS).map((row, i) => (
                        <tr key={i} className="border-b text-muted-foreground">{row.map((cell, j) => <td key={j} className="py-[calc(var(--px)*6)]">{String(cell)}</td>)}</tr>
                    ))}
                    </tbody>
                </table>
            );
        default: {
            const x = column(header.x);
            const y = column(header.y);
            const max = Math.max(...result.rows.map(row => Number(row[y]) || 0), 1);
            return (
                <div className="flex h-full items-end gap-[calc(var(--px)*6)] border-b pb-px" aria-hidden>
                    {result.rows.map(row => (
                        <div key={String(row[x])} className="flex-1 rounded-t-sm bg-[hsl(var(--chart-1))]" style={{height: `${(Number(row[y]) || 0) / max * 100}%`}}/>
                    ))}
                </div>
            );
        }
    }
}
