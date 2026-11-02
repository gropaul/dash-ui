'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {DuckDBDataProtocol} from "@duckdb/duckdb-wasm";
import {FileSpreadsheet, Loader2, Plus, Sheet, Trash2, Upload} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RelationView} from "@/components/relation/relation-view";
import {useRelationModel} from "@/components/relation/use-relation-model";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationConfig} from "@/state/workspace/relation-config";
import {DuckdbWasmProvider} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {cn} from "@/lib/utils";
import {SidebarResizeHandle} from "@/components/layout/sidebar-resize-handle";
import {connect, startDatabase, useWaitingForDatabase} from "@web/components/site-runtime";
import {
    addViewerFile,
    deleteViewerFile,
    formatSize,
    loadViewerFiles,
    readViewerFile,
    useViewerFiles,
    ViewerFile,
    viewerFormat,
} from "@web/components/data-viewer/viewer-files";

const ACCEPT = '.parquet,.csv,.tsv';
const SAMPLE = '/data/services-2025-38.parquet';
const FILES_WIDTH = 260;
const FILES_WIDTH_KEY = 'data-viewer-files-width';

function savedFilesWidth(): number {
    try {
        return Number(localStorage.getItem(FILES_WIDTH_KEY)) || FILES_WIDTH;
    } catch {
        return FILES_WIDTH;
    }
}

function saveFilesWidth(width: number) {
    try {
        localStorage.setItem(FILES_WIDTH_KEY, String(width));
    } catch {
        // Not kept: private window or storage blocked.
    }
}

connect([]);

/** Hands the kept file to DuckDB under its name, read from the browser as queries need it, not copied. */
async function registerFile(name: string) {
    const file = await readViewerFile(name);
    await startDatabase();
    const {db} = await DuckdbWasmProvider.getInstance().getCurrentWasm();
    await db.dropFile(name).catch(() => undefined);
    await db.registerFileHandle(name, file, DuckDBDataProtocol.BROWSER_FILEREADER, true);
}

/** The query reading the file: a CSV starting with a UTF-16 byte order mark (as Google Ads exports do) says so. */
async function fileQuery(name: string): Promise<string> {
    const path = name.replace(/'/g, "''");
    if (viewerFormat(name) !== 'csv') return `SELECT * FROM '${path}'`;
    const head = new Uint8Array(await (await readViewerFile(name)).slice(0, 2).arrayBuffer());
    const utf16 = (head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff);
    return utf16 ? `SELECT * FROM read_csv('${path}', encoding = 'utf-16')` : `SELECT * FROM '${path}'`;
}

async function openFile(name: string) {
    await registerFile(name);
    const sql = await fileQuery(name);
    useViewerFiles.setState(state => ({open: name, sql, opened: state.opened + 1}));
}

/**
 * The data viewer: the files kept in this browser on the left, the open one in the app's relation view, its schema
 * in the side panel. A file dropped anywhere on it is kept and opened.
 */
export default function DataViewerTool() {
    const {files, loaded, open, sql, opened} = useViewerFiles();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const [dragging, setDragging] = useState(false);
    const [filesWidth, setFilesWidth] = useState(FILES_WIDTH);
    // The width while the list's edge is dragged; saved once the drag ends.
    const [dragWidth, setDragWidth] = useState<number>();
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        void startDatabase();
        void loadViewerFiles();
        setFilesWidth(savedFilesWidth());
    }, []);

    const openKept = useCallback(async (name: string) => {
        setError(undefined);
        try {
            await openFile(name);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }, []);

    const add = useCallback(async (file: File) => {
        if (!viewerFormat(file.name)) {
            setError(`${file.name} is not a Parquet or CSV file`);
            return;
        }
        setError(undefined);
        setBusy(true);
        try {
            await addViewerFile(file);
            await openFile(file.name);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }, []);

    const addSample = useCallback(async () => {
        const response = await fetch(SAMPLE);
        const blob = await response.blob();
        await add(new File([blob], SAMPLE.split('/').pop()!, {type: 'application/octet-stream'}));
    }, [add]);

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void add(file);
    };

    const total = files.reduce((sum, f) => sum + f.size, 0);

    return (
        <div
            className="data-viewer relative flex h-full min-h-0 flex-col bg-background md:flex-row"
            onDragOver={e => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={e => {
                if (e.currentTarget === e.target) setDragging(false);
            }}
            onDrop={onDrop}
        >
            <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) void add(file);
                e.target.value = '';
            }}/>

            <aside aria-label="Files" style={{'--files-width': `${dragWidth ?? filesWidth}px`} as React.CSSProperties}
                   className="relative flex max-h-48 min-h-0 shrink-0 flex-col border-b bg-muted-background md:max-h-none md:w-[var(--files-width)] md:border-b-0 md:border-r">
                <div className="flex items-center justify-between px-2 pt-3">
                    <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Files</span>
                    <button aria-label="Open a file" onClick={() => input.current?.click()}
                            className="mr-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
                        <Plus className="h-3.5 w-3.5"/>
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-1">
                    {loaded && files.length === 0 && (
                        <p className="px-3 py-1 text-sm text-muted-foreground">Files you open are kept here, so you can open them again later.</p>
                    )}
                    {files.map(file => (
                        <FileRow key={file.name} file={file} current={file.name === open} onOpen={() => void openKept(file.name)}/>
                    ))}
                </div>
                <div className="border-t px-5 py-2.5 text-xs text-muted-foreground">
                    Kept in this browser only · <span className="text-foreground">{formatSize(total)}</span>
                </div>
                <SidebarResizeHandle width={filesWidth} onDrag={setDragWidth} className="hidden md:block" onEnd={width => {
                    setFilesWidth(width);
                    saveFilesWidth(width);
                }}/>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {open && sql && error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
                {open && sql ? (
                    <div className="min-h-0 flex-1">
                        <OpenFile key={`${open}#${opened}`} name={open} sql={sql}/>
                    </div>
                ) : (
                    <DropZone busy={busy} error={error} onChoose={() => input.current?.click()} onSample={() => void addSample()}/>
                )}
            </div>

            {dragging && (
                <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-background/80 text-sm font-medium">
                    Drop to open
                </div>
            )}
        </div>
    );
}

function FileRow({file, current, onOpen}: { file: ViewerFile, current: boolean, onOpen: () => void }) {
    const Icon = file.format === 'csv' ? Sheet : FileSpreadsheet;
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={e => e.key === 'Enter' && onOpen()}
            className={cn(
                "group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md pl-3 pr-1 text-sm transition-colors",
                current ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
        >
            <Icon className="h-4 w-4 shrink-0"/>
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            {/* The size and the delete button share one place, so hovering doesn't change the name's width. */}
            <span className="relative flex h-6 shrink-0 items-center">
                <span className="text-xs tabular-nums text-muted-foreground group-hover:invisible">{formatSize(file.size)}</span>
                <button
                    aria-label={`Delete ${file.name}`}
                    onClick={e => {
                        e.stopPropagation();
                        void deleteViewerFile(file.name);
                    }}
                    className="invisible absolute inset-y-0 right-0 flex w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:visible"
                >
                    <Trash2 className="h-3.5 w-3.5"/>
                </button>
            </span>
        </div>
    );
}

function DropZone({busy, error, onChoose, onSample}: { busy: boolean, error?: string, onChoose: () => void, onSample: () => void }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border-2 border-dashed px-8 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                    {busy ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5"/>}
                </div>
                <p className="mt-3 text-lg font-semibold">Drop a file here</p>
                <p className="mt-1 text-sm text-muted-foreground">Parquet or CSV</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Button className="rounded-2xl" onClick={onChoose} disabled={busy}>Choose a file</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={onSample} disabled={busy}>Try a sample file</Button>
                </div>
                {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </div>
        </div>
    );
}

/**
 * The open file as a query reading it, in the relation view. What a query file would hold (its SQL and header lines,
 * among them the view) is kept here instead, in memory, until another file opens.
 */
function OpenFile({name, sql}: { name: string, sql: string }) {
    const [text, setText] = useState<{ sql: string, header: Record<string, string> }>({sql, header: {view: 'table'}});
    const config = useMemo((): RelationConfig => ({
        id: `data-viewer/${name}`,
        name: name.replace(/\.[^.]+$/, ''),
        ...text,
    }), [name, text]);
    const write = useCallback((sql: string, header: Record<string, string>) => setText({sql, header}), []);
    const model = useRelationModel(config, write);
    const waiting = useWaitingForDatabase();

    // Each open runs the query, without filters: the file under this name may be another one now, and the view holds the
    // last result.
    useEffect(() => {
        if (!model) return;
        const relationState = {...model.relation, statsFilters: undefined};
        const actions = getRelationActions({mode: 'fullscreen', relationState, updateRelation: model.updateRelation});
        void actions.updateRelationDataWithBaseQuery(model.relation.query.baseQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model?.relation.id]);

    if (!model) return null;
    return (
        <div className="relative h-full">
            <RelationView mode='fullscreen' height='fit' relationState={model.relation} updateRelation={model.updateRelation}
                          plainSqlEditor configTab='schema'/>
            {waiting && (
                <div role="status" className="absolute bottom-3 right-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin"/>
                    Loading DuckDB…
                </div>
            )}
        </div>
    );
}
