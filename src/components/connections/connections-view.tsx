'use client';

import {useCallback, useEffect, useMemo, useState} from "react";
import {Code2, List, Plus, RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {ViewPadding} from "@/components/ui/view-padding";
import {SqlEditor} from "@/components/basics/sql-editor/sql-editor";
import {AttachDatabaseDialog, DialogResult} from "@/components/connections/attach-database-dialog";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DASH_INTERNAL_CATALOGS} from "@/platform/global-data";
import {getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {useProjectsState} from "@/state/projects.state";
import {initProjectSources} from "@/state/sources/replay-sources";
import {useSourcesHealthState} from "@/state/sources/sources-health.state";
import {aliasFromPath, appendStatement, buildAttachStatement, parseAttach} from "@/state/sources/sources-manifest";
import {cn} from "@/lib/utils";
import {isDebugMode} from "@/components/settings/about-content";

type ViewMode = 'manage' | 'sql';

interface ConnectionRow {
    alias: string;
    path: string | null;
    readonly: boolean;
    status: 'attached' | 'error';
    error?: string | null;
}

// System catalogs that are never user connections.
const SYSTEM_DATABASES = ['memory', 'system', 'temp'];

/**
 * The per-project Connections tab (`/projects/<id>/connections`). Manages the project's
 * `sources.sql` manifest (the single source of truth - the state layer still calls these sources)
 * as a simple list ⇄ SQL view. The list is derived: attached databases come from the live catalog
 * (`duckdb_databases()`), and declared-but-failed connections come from the last replay
 * (sources-health). Editing the SQL / attaching a database rewrites `sources.sql`.
 */
export function ConnectionsView() {
    const currentProject = useProjectsState((s) => s.getCurrentProject());
    const setProjectSources = useProjectsState((s) => s.setProjectSources);
    const projectId = currentProject?.id;
    const projectSources = currentProject?.sourcesSql ?? "";

    const [mode, setMode] = useState<ViewMode>('manage');
    const [attached, setAttached] = useState<ConnectionRow[]>([]);
    const [manifest, setManifest] = useState<string>(projectSources);
    const [busy, setBusy] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const health = useSourcesHealthState((s) => s.results);
    const isMemory = getStorageMode() === 'memory';

    const isDebug = isDebugMode();

    const hidden_databases = SYSTEM_DATABASES.concat(isDebug ? [] : DASH_INTERNAL_CATALOGS);

    const fetchAttached = useCallback(async () => {
        const res = await ConnectionsService.getInstance().executeQuery(
            `SELECT database_name, path, readonly
             FROM duckdb_databases()
             WHERE database_name NOT IN (${hidden_databases.map((d) => `'${d}'`).join(', ')})
             ORDER BY database_name`,
            true,
        );
        setAttached(res.rows.map((r): ConnectionRow => ({
            alias: String(r[0]),
            path: r[1] == null ? null : String(r[1]),
            readonly: Boolean(r[2]),
            status: 'attached',
        })));
    }, []);

    // Keep the editor draft in sync with the stored manifest (resets when switching projects, and
    // after a save writes the project's sourcesSql back).
    useEffect(() => {
        setManifest(projectSources);
    }, [projectId, projectSources]);

    useEffect(() => {
        void fetchAttached();
    }, [fetchAttached]);

    // Declared-but-failed connections from the last replay (a moved/missing file, a catalog error, …),
    // excluding any alias that did end up attached.
    const rows = useMemo<ConnectionRow[]>(() => {
        const attachedAliases = new Set(attached.map((r) => r.alias));
        const failed: ConnectionRow[] = health
            .filter((h) => !h.ok)
            .map((h): ConnectionRow => {
                const parsed = parseAttach(h.statement);
                return {
                    alias: parsed?.alias ?? "(statement)",
                    path: parsed?.path ?? null,
                    readonly: parsed?.readonly ?? false,
                    status: 'error',
                    error: h.error,
                };
            })
            .filter((r) => !attachedAliases.has(r.alias));
        return [...attached, ...failed];
    }, [attached, health]);

    const needsAttention = rows.filter((r) => r.status === 'error').length;

    const saveManifest = useCallback(async (text: string) => {
        setBusy(true);
        try {
            if (projectId) setProjectSources(projectId, text);
            await initProjectSources();
            await fetchAttached();
        } finally {
            setBusy(false);
        }
    }, [fetchAttached, projectId, setProjectSources]);

    const reAttachAll = useCallback(async () => {
        setBusy(true);
        try {
            await initProjectSources();
            await fetchAttached();
        } finally {
            setBusy(false);
        }
    }, [fetchAttached]);

    const addConnection = useCallback(async (result: DialogResult) => {
        // URL / path only. Uploading a local .duckdb needs the provider's registerFileHandle path
        // (a raw OPFS write isn't visible to DuckDB's VFS); that's a separate task.
        const path = (result.url ?? "").trim();
        if (!path) return;
        setBusy(true);
        try {
            const connection = ConnectionsService.getInstance().getDatabaseConnection();
            if (path.startsWith('http://') || path.startsWith('https://')) {
                await connection.executeQuery("INSTALL httpfs;", false);
                await connection.executeQuery("LOAD httpfs;", false);
            }
            const statement = buildAttachStatement(path, aliasFromPath(path), false);
            await connection.executeQuery(statement, false);
            if (projectId) setProjectSources(projectId, appendStatement(projectSources, statement));
            await fetchAttached();
        } finally {
            setBusy(false);
        }
    }, [fetchAttached, projectId, projectSources, setProjectSources]);

    return (
        <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent={'bg-accent'}>
            <ViewHeader
                title="Data Connections"
                subtitle={
                    <span className="text-muted-foreground">
                        {rows.length} declared
                        {needsAttention > 0 && <> · <span
                            className="text-destructive">{needsAttention} need attention</span></>}
                    </span>
                }
                actionButtons={
                    <div className="flex items-center gap-2">
                        <ModeToggle mode={mode} onChange={setMode}/>
                        <TooltipWrapper message="Re-attach all connections">
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy}
                                    onClick={reAttachAll}>
                                <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")}/>
                            </Button>
                        </TooltipWrapper>
                        <Button size="sm" disabled={busy} onClick={() => setAddOpen(true)}>
                            <Plus className="mr-1 h-4 w-4"/> Attach
                        </Button>
                    </div>
                }
            />

            <div className="bg-card border rounded-2xl w-full h-full flex flex-col min-h-0 overflow-hidden">
                {isMemory && (
                    <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                        Running in memory mode — connections are not persisted across reloads.
                    </div>
                )}

                {mode === 'manage' ? (
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {rows.length === 0 ? (
                            <div
                                className="h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                                <div className="text-sm">No connections yet.</div>
                                <div className="text-xs">Attach a database, or add reads in the SQL view.</div>
                            </div>
                        ) : (
                            rows.map((row) => <ConnectionListItem key={`${row.status}:${row.alias}`} row={row}/>)
                        )}
                    </div>
                ) : (
                    <SqlView manifest={manifest} onManifestChange={setManifest} onSave={saveManifest} busy={busy}/>
                )}
            </div>

            <AttachDatabaseDialog isOpen={addOpen} onClose={() => setAddOpen(false)} onSubmit={addConnection}/>
        </ViewPadding>
    );
}

function ModeToggle({mode, onChange}: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
    return (
        <div className="inline-flex rounded-md border overflow-hidden">
            <Button
                variant={mode === 'manage' ? 'secondary' : 'ghost'} size="sm" className="h-8 rounded-none border-0"
                onClick={() => onChange('manage')}
            >
                <List className="mr-1 h-4 w-4"/> Manage
            </Button>
            <Button
                variant={mode === 'sql' ? 'secondary' : 'ghost'} size="sm"
                className="h-8 rounded-none border-0 border-l"
                onClick={() => onChange('sql')}
            >
                <Code2 className="mr-1 h-4 w-4"/> sources.sql
            </Button>
        </div>
    );
}

function ConnectionListItem({row}: { row: ConnectionRow }) {
    const dot = row.status === 'attached'
        ? <span className="h-2 w-2 rounded-full bg-green-500 shrink-0"/>
        : <span className="h-2 w-2 rounded-full bg-red-500 shrink-0"/>;
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
            {row.error ? <TooltipWrapper message={row.error}>{dot}</TooltipWrapper> : dot}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm truncate">{row.alias}</span>
                    {row.readonly &&
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">read-only</span>}
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate">
                    {row.status === 'error' ? (row.path ?? 'could not attach') : (row.path ?? '')}
                </div>
            </div>
            <span className={cn("text-xs", row.status === 'attached' ? "text-muted-foreground" : "text-destructive")}>
                {row.status === 'attached' ? 'attached' : 'missing'}
            </span>
        </div>
    );
}

function SqlView({manifest, onManifestChange, onSave, busy}: {
    manifest: string;
    onManifestChange: (text: string) => void;
    onSave: (text: string) => void;
    busy: boolean;
}) {
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0">
                <SqlEditor
                    embedded
                    language="sql"
                    displayCode={manifest}
                    onCodeChange={onManifestChange}
                    showLineNumbers
                    height="100%"
                    width="100%"
                />
            </div>
            <div className="flex items-center justify-end gap-2 p-3 border-t">
                <span className="text-xs text-muted-foreground mr-auto">Runs on project open. Source of truth.</span>
                <Button size="sm" disabled={busy} onClick={() => onSave(manifest)}>Save &amp; re-attach</Button>
            </div>
        </div>
    );
}
