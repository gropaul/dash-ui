import {ConnectionsService} from "@/state/connections/connections-service";
import {useDatabaseState} from "@/state/database.state";
import {dropRelationMacro, generateCreateMacroSQLInternal, orderMacroStatements} from "@/state/relations/sql/table-macros";
import {buildRelation, splitHeader} from "@/state/workspace/relation-config";
import {queryName} from "@/state/workspace/file-references";
import {isQuery} from "@/state/workspace/workspace-tree";
import {useWorkspace} from "@/state/workspace/workspace.state";

/**
 * Each `.sql` file of the workspace is the table macro `dash.refs.<name>()`, so queries, page blocks and Python
 * can read it. The macros follow the files: registered at project load and again whenever a query changes.
 */

const queriesOf = (files: Record<string, string>) => Object.entries(files).filter(([path]) => isQuery(path));

function createSql(path: string, text: string) {
    const {header, sql} = splitHeader(text);
    return generateCreateMacroSQLInternal(buildRelation({id: path, name: queryName(path), sql, header}));
}

async function execute(sql: string) {
    try {
        await ConnectionsService.getInstance().executeQuery(sql);
    } catch (error) {
        console.error(`Failed to register a query macro: ${sql}`, error);
    }
}

/** Registers every query's macro, those a query reads first. */
export async function registerQueryMacros(files: Record<string, string>) {
    const macros = await Promise.all(queriesOf(files)
        .filter(([, text]) => splitHeader(text).sql)
        .map(async ([path, text]) => ({key: queryName(path).toLowerCase(), createSql: await createSql(path, text)})));
    for (const sql of orderMacroStatements(macros)) await execute(sql);
}

// Typing in a query writes its file on every pause; its macro follows once the typing stops.
const FOLLOW_DELAY_MS = 500;

/** Keeps the macros in step with the query files until the returned function is called. */
export function followQueryMacros(): () => void {
    let synced = useWorkspace.getState().files;
    let running = Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = async () => {
        const before = new Map(queriesOf(synced));
        synced = useWorkspace.getState().files;
        const after = new Map(queriesOf(synced));
        let changed = false;
        for (const path of before.keys()) {
            if (after.has(path)) continue;
            await dropRelationMacro(queryName(path));
            changed = true;
        }
        for (const [path, text] of after) {
            if (before.get(path) === text || !splitHeader(text).sql) continue;
            await execute(await createSql(path, text));
            changed = true;
        }
        if (changed) await useDatabaseState.getState().refresh(['structure']);
    };

    const unsubscribe = useWorkspace.subscribe((state, previous) => {
        if (state.files === previous.files) return;
        clearTimeout(timer);
        timer = setTimeout(() => running = running.then(sync), FOLLOW_DELAY_MS);
    });
    return () => {
        clearTimeout(timer);
        unsubscribe();
    };
}
