import {callsRef} from "@/platform/sql-refs";
import {extractMacroRefs} from "@/state/relations/sql/table-macros";
import {baseName, isWithin, samePath} from "@/state/workspace/paths";
import {inputsOf, linksOf, sqlFences} from "@/state/workspace/page-text";
import {isPage, isQuery} from "@/state/workspace/workspace-tree";

/** A query's name, what `refs.<name>()` calls it by: its file name without `.sql`. */
export function queryName(path: string): string {
    return baseName(path).slice(0, -'.sql'.length);
}

/** The query named `name`; query names are unique in the project, ignoring case. */
export function queryByName(files: Record<string, string>, name: string): string | undefined {
    return Object.keys(files).find(path => isQuery(path) && samePath(queryName(path), name));
}

/** The queries the SQL calls through `refs.<name>()`, as paths, or as the bare name when no query has it. */
export function queriesCalledBy(files: Record<string, string>, sql: string): { name: string, path?: string }[] {
    return extractMacroRefs(sql).map(name => ({name, path: queryByName(files, name)}));
}

/**
 * The files using the file at `path`: for a query, the queries and page blocks calling `refs.<name>()` and the
 * pages taking it in; for a page, the pages linking to it.
 */
export function usersOf(files: Record<string, string>, path: string): { queries: string[], pages: string[] } {
    const others = Object.entries(files).filter(([p]) => p !== path);
    if (isPage(path)) {
        return {queries: [], pages: others.filter(([p, text]) => isPage(p) && linksOf(p, text).some(l => samePath(l, path))).map(([p]) => p)};
    }
    const name = queryName(path).toLowerCase();
    return {
        queries: others.filter(([p, text]) => isQuery(p) && callsRef(text, name)).map(([p]) => p),
        pages: others.filter(([p, text]) => isPage(p) && (
            sqlFences(text).some(f => callsRef(f.body, name)) || inputsOf(p, text).some(i => samePath(i, path))
        )).map(([p]) => p),
    };
}

/** The files outside `path` (a file or a folder) using what is in it. */
export function usersOutside(files: Record<string, string>, path: string): string[] {
    const users = Object.keys(files).filter(p => isWithin(p, path)).flatMap(p => {
        const {queries, pages} = usersOf(files, p);
        return [...queries, ...pages];
    });
    return [...new Set(users)].filter(p => !isWithin(p, path)).sort();
}
