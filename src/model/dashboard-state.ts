import {getInitialTabViewBaseState, TabViewBaseState} from "@/model/relation-view-state";
import {getRandomId} from "@/platform/id-utils";
import {EntityBase} from "@/state/entities/entity-base";
import {renameRefCalls} from "@/platform/sql-refs";

export interface DashboardViewState extends TabViewBaseState {

}

export function getInitDashboardViewState(displayName: string): DashboardViewState {
    return {
        ...getInitialTabViewBaseState(displayName),
    };
}

/**
 * A dashboard is one markdown page (see components/page-editor/markdown.ts): text, blocks with their own SQL,
 * and references to relations of the project, laid out in rows of columns.
 */
export interface DashboardState extends EntityBase {
    id: string;
    name: string;
    viewState: DashboardViewState;
    markdown: string;
}

export function getInitDashboardState(displayName: string = "New Dashboard", id?: string): DashboardState {
    return {
        id: id ?? `dashboard-${getRandomId()}`,
        name: displayName,
        viewState: getInitDashboardViewState(displayName),
        markdown: '',
    };
}

// A reference block is a sql fence whose header holds the relation's id; components/page-editor/markdown.ts
// reads and writes it. The store edits dashboards as text, so the few edits it makes work on the fence here.
const RELATION_REFERENCE_KEY = 'relation';
const REFERENCE_FENCE = new RegExp(
    String.raw`^[ \t]*\`\`\`sql[ \t]*\n[ \t]*--[ \t]*${RELATION_REFERENCE_KEY}:[ \t]*(\S+)[ \t]*\n(?:[ \t]*--.*\n)*[ \t]*\`\`\`[ \t]*$`,
    'gm',
);

export function relationReferenceFence(relationId: string, rows: number = 6): string {
    return ['```sql', `-- ${RELATION_REFERENCE_KEY}: ${relationId}`, `-- rows: ${rows}`, '```'].join('\n');
}

/** Adds a block (any markdown) at the end of the page. */
export function appendToMarkdown(markdown: string, addition: string): string {
    const current = markdown.trimEnd();
    return current ? `${current}\n\n${addition}\n` : `${addition}\n`;
}

/** The ids of the relations the page references, each once, in reading order. */
export function referencedRelationIds(markdown: string): string[] {
    return Array.from(new Set(Array.from(markdown.matchAll(REFERENCE_FENCE), m => m[1])));
}

/** How often the page references each relation. */
export function countRelationReferences(markdown: string, relationId: string): number {
    return Array.from(markdown.matchAll(REFERENCE_FENCE)).filter(m => m[1] === relationId).length;
}

/** The page without its references to `relationIds`. */
export function removeRelationReferences(markdown: string, relationIds: Set<string>): string {
    return markdown
        .replace(REFERENCE_FENCE, (fence, id: string) => relationIds.has(id) ? '' : fence)
        .replace(/\n{3,}/g, '\n\n');
}

// Any sql fence: its indentation, its info after `sql` (the block's name) and its content.
const SQL_FENCE = /^([ \t]*)```sql([^\n]*)\n([\s\S]*?)^\1```[ \t]*$/gm;

/** The names of the page's blocks, ```sql <name>. */
export function blockNames(markdown: string): string[] {
    return Array.from(markdown.matchAll(SQL_FENCE), m => m[2].trim()).filter(Boolean);
}

/**
 * The page with the calls of `refs.<from>(…)` in its blocks renamed to `refs.<to>(…)`, after a relation of the
 * project was renamed. A page with a block named `from` is left alone: there the calls mean that block.
 */
export function renameRefsInMarkdown(markdown: string, from: string, to: string): string {
    if (blockNames(markdown).includes(from)) return markdown;
    return markdown.replace(SQL_FENCE, (_fence, indent: string, info: string, body: string) =>
        `${indent}\`\`\`sql${info}\n${renameRefCalls(body, from, to)}${indent}\`\`\``);
}

/** Whether a block of the page calls `refs.<name>(…)` of a relation of the project. */
export function callsRefInMarkdown(markdown: string, name: string): boolean {
    return renameRefsInMarkdown(markdown, name, `${name}_`) !== markdown;
}
