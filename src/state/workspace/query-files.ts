import {getBaseQueryFromSource} from "@/model/relation-state";
import {RelationSource} from "@/model/relation";
import {sanitizeMacroName} from "@/platform/sql-utils";
import {DashNavigator} from "@/state/routing/navigation";
import {queryByName} from "@/state/workspace/file-references";
import {useWorkspace} from "@/state/workspace/workspace.state";

/** The name a query of `source` gets by default: its table's or file's name. */
export function nameForSource(source: RelationSource): string {
    return source.type === 'table' ? source.tableName : source.type === 'file' ? source.baseName : source.name;
}

/**
 * Writes `sql` to a new query file at the top level, named after `name` and numbered if a query has that name,
 * and opens it.
 */
async function createQueryFile(name: string, sql: string): Promise<string> {
    const base = sanitizeMacroName(name) || 'query';
    let candidate = base;
    for (let n = 2; queryByName(useWorkspace.getState().files, candidate); n++) candidate = `${base}_${n}`;
    const path = `${candidate}.sql`;
    await useWorkspace.getState().write(path, sql);
    DashNavigator.instance().navigateToPath(path);
    return path;
}

export function createQueryFileFromSource(source: RelationSource): Promise<string> {
    return createQueryFile(nameForSource(source), getBaseQueryFromSource(source));
}
