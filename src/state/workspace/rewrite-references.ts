import {renameRefCalls} from "@/platform/sql-refs";
import {queryName} from "@/state/workspace/file-references";
import {LINK, encodeLink, mapPage, pageLinkTarget} from "@/state/workspace/page-text";
import {isWithin, movedPath, relativePath, resolveRelative, samePath} from "@/state/workspace/paths";
import {displayName, isPage, isQuery} from "@/state/workspace/workspace-tree";

const INPUT_LINE = /^([ \t]*--[ \t]*input:[ \t]*)(\S.*?)([ \t]*)$/m;

/**
 * The files whose text changes when `from` (a file or a folder) moves to `to`, by their path after the move, with
 * their new text: page links and `-- input:` paths follow what moved, from wherever the page ends up, and a
 * renamed query's `refs.<name>()` calls take its new name. A link showing a renamed page's name shows the new one.
 */
export function rewriteReferences(files: Record<string, string>, from: string, to: string): Record<string, string> {
    const moved = (path: string) => isWithin(path, from) ? movedPath(path, from, to) : path;
    const inside = Object.keys(files).filter(p => isWithin(p, from));
    const renamedQueries = inside.filter(isQuery)
        .map(p => [queryName(p).toLowerCase(), queryName(moved(p))] as const)
        .filter(([before, after]) => before !== after);
    const renamedPages = new Map(inside.filter(isPage)
        .map(p => [displayName(p), displayName(moved(p))] as const)
        .filter(([before, after]) => before !== after));

    // The path to `target` (as it exists before the move), as the page `page` writes it after the move.
    const pathFrom = (page: string, target: string) => {
        const existing = Object.keys(files).find(p => samePath(p, target));
        return existing && relativePath(moved(page), moved(existing));
    };
    const renameRefs = (sql: string) => renamedQueries.reduce((s, [before, after]) => renameRefCalls(s, before, after), sql);

    const changes: Record<string, string> = {};
    for (const [path, text] of Object.entries(files)) {
        const next = isQuery(path) ? renameRefs(text) : !isPage(path) ? text : mapPage(text,
            outside => outside.replace(LINK, (link, label: string, url: string) => {
                const target = pageLinkTarget(path, url);
                // Only a link whose page or target moves is written anew.
                const followed = target && (isWithin(path, from) || isWithin(target, from)) && pathFrom(path, target);
                if (!target || !followed) return link;
                const newLabel = isWithin(target, from) ? renamedPages.get(label) ?? label : label;
                return `[${newLabel}](${encodeLink(followed)})`;
            }),
            body => renameRefs(body.replace(INPUT_LINE, (line, start: string, input: string, end: string) => {
                const target = resolveRelative(path, input);
                const followed = target && (isWithin(path, from) || isWithin(target, from)) && pathFrom(path, target);
                return followed ? start + followed + end : line;
            })),
        );
        if (next !== text) changes[moved(path)] = next;
    }
    return changes;
}
