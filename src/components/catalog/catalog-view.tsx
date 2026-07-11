'use client';

import React, {useMemo, useState} from "react";
import {ResizableHandle, ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {ViewPadding} from "@/components/ui/view-padding";
import {useDataSourcesState} from "@/state/data-sources.state";
import {useGUIState} from "@/state/gui.state";
import {DATA_ROOT, parseRoute} from "@/state/routing/core-model";
import {navigate} from "@/state/routing/navigation";
import {useCurrentPath} from "@/state/routing/use-location";
import {
    CatalogObject,
    CatalogSelection,
    ColumnRow,
    dataListRoute,
    dataRoute,
    includesQ,
    objectPath,
    objectPathStr,
    resolveDataRoute,
    Scope,
    sortRows,
    SortState,
    useCatalogObjects,
} from "@/components/catalog/catalog-model";
import {buildCatalogTags, columnMatchesTag, objectMatchesTag} from "@/components/catalog/utils/catalog-tags";
import {CatalogToolbar} from "@/components/catalog/catalog-toolbar";
import {CatalogGrid} from "@/components/catalog/catalog-grid";
import {CatalogDetail} from "@/components/catalog/detail/catalog-detail";
import {CatalogHeaderActions} from "@/components/catalog/utils/catalog-header-actions";

/**
 * The /data catalog: a structural, query-free browser over every internal-database
 * connection's loaded tables and columns. Mirrors the FolderView layout (ViewPadding +
 * ViewHeader + card). The grid sits on the left; selecting a row opens a detail panel on
 * the right (resizable, width persisted via gui.sidebarSplitRatio) that can expand to full
 * screen — the panel and full-screen views render the same component.
 */
export function CatalogView() {
    const objects = useCatalogObjects();
    const connections = useDataSourcesState((s) => s.connections);
    const refreshConnection = useDataSourcesState((s) => s.refreshConnection);
    const splitRatio = useGUIState((s) => s.sidebarSplitRatio);
    const setSplitRatio = useGUIState((s) => s.setConfigSplitRatio);

    const [scope, setScope] = useState<Scope>('tables');
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeTag, setActiveTag] = useState("");
    const [sort, setSort] = useState<SortState>({key: 'path', dir: 'asc'});
    const [selection, setSelection] = useState<CatalogSelection | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Full-screen detail is URL-driven: /data/<db>/<schema>/<table>[/<column>].
    const pathname = useCurrentPath();
    const routeTarget = useMemo(() => resolveDataRoute(objects, pathname), [objects, pathname]);

    // The path filter is URL-backed too: /data/<db>[/<schema>] narrows the list, so it's
    // linkable from the breadcrumb and shareable. A resolved object route is a detail view,
    // not a filter, so it carries no path filter.
    const pathFilter = useMemo(
        () => routeTarget ? [] : parseRoute(pathname).params.segments,
        [routeTarget, pathname],
    );
    const setPathFilter = (path: string[]) => navigate(dataListRoute(path));

    /** Navigate to a selection's full-screen route (used by double-click, expand, cross-links). */
    const openFullScreen = (sel: CatalogSelection) => {
        const o = objects.find((x) => x.id === sel.objId);
        if (o) navigate(dataRoute(o, sel.colName));
    };

    const sourceNames = useMemo(() => Array.from(new Set(objects.map((o) => o.connectionName))).sort(), [objects]);

    // The facet chips + the resolved active one; all filtering keys off this single tag.
    const tags = useMemo(() => buildCatalogTags(scope, sourceNames), [scope, sourceNames]);
    const activeTagDef = useMemo(() => tags.find((t) => t.key === activeTag), [tags, activeTag]);

    // Objects narrowed by path + search only — the stable base the facet chip counts read from.
    const scoped = useMemo(() => {
        const pathOk = (o: CatalogObject) => pathFilter.every((seg, i) => objectPath(o)[i] === seg);
        const searchOk = (o: CatalogObject) => scope === 'columns'
            ? o.columns.some((c) => includesQ(c.name, search)) || includesQ(objectPathStr(o), search)
            : includesQ(o.name, search) || includesQ(objectPathStr(o), search);
        return objects.filter((o) => pathOk(o) && searchOk(o));
    }, [objects, pathFilter, search, scope]);

    const tableRows = useMemo(() => sortRows(
        scoped.filter((o) => objectMatchesTag(o, activeTagDef)),
        sort,
        {path: objectPathStr, name: (o) => o.name, type: (o) => o.objType, cols: (o) => o.columns.length},
    ), [scoped, activeTagDef, sort]);

    const columnRows = useMemo(() => {
        const rows: ColumnRow[] = [];
        for (const o of scoped) {
            if (!objectMatchesTag(o, activeTagDef)) continue;
            for (const col of o.columns) {
                if (!columnMatchesTag(col, activeTagDef)) continue;
                if (!includesQ(col.name, search)) continue;
                rows.push({o, col});
            }
        }
        return sortRows(rows, sort, {
            path: (r) => objectPathStr(r.o),
            name: (r) => r.col.name,
            type: (r) => r.col.type
        });
    }, [scoped, activeTagDef, search, sort]);

    const selectedObject = selection ? objects.find((o) => o.id === selection.objId) ?? null : null;
    const selectedColumn = selectedObject && selection?.colName
        ? selectedObject.columns.find((c) => c.name === selection.colName) ?? null : null;

    async function onRefreshAll() {
        setRefreshing(true);
        try {
            await Promise.all(Object.keys(connections).map((id) => refreshConnection(id)));
        } finally {
            setRefreshing(false);
        }
    }

    function onSort(key: string) {
        setSort((prev) => prev.key === key ? {key, dir: prev.dir === 'asc' ? 'desc' : 'asc'} : {key, dir: 'asc'});
    }

    // Full-screen route: render the same detail component, filling the view. Collapse/close
    // navigate back to the list; cross-links navigate to the next object/column.
    if (routeTarget) {
        const {object, colName} = routeTarget;
        return (
            <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent="bg-accent">
                <CatalogDetail
                    object={object}
                    column={colName ? object.columns.find((c) => c.name === colName) : null}
                    mode="full"
                    onToggleExpand={() => {
                        setSelection({objId: object.id, colName});
                        navigate(DATA_ROOT);
                    }}
                    onClose={() => {
                        setSelection(null);
                        navigate(DATA_ROOT);
                    }}
                    onSelect={openFullScreen}
                />
            </ViewPadding>
        );
    }

    const detailSize = Math.round(splitRatio * 100);

    // The detail lives at the root level — a sibling of the padded main column — so it
    // spans the full height (alongside the header), not nested inside ViewPadding.
    return (
        <div className="h-full w-full bg-accent">
            <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={selectedObject ? 100 - detailSize : 100} minSize={30}>
                    <ViewPadding active addPaddingBottom className="h-full flex flex-col" classNameParent="bg-accent">
                        <ViewHeader
                            title={scope === 'tables' ? 'Tables' : 'Columns'}
                            actionButtons={
                                <CatalogHeaderActions
                                    scope={scope} onScopeChange={setScope}
                                    onRefreshAll={onRefreshAll} refreshing={refreshing}
                                />
                            }
                        />
                        <div className="bg-card p-8 border rounded-2xl w-full h-full flex flex-col min-h-0">
                            <CatalogToolbar
                                items={scoped} tags={tags}
                                activeTag={activeTag} setActiveTag={setActiveTag}
                                search={search} setSearch={setSearch} searchOpen={searchOpen} setSearchOpen={setSearchOpen}
                                pathFilter={pathFilter} onClearPath={() => setPathFilter([])}
                            />
                            <div className="flex-1 min-h-0">
                                <CatalogGrid
                                    scope={scope} tableRows={tableRows} columnRows={columnRows}
                                    selection={selection} sort={sort} onSort={onSort}
                                    onSelect={(sel) => setSelection(sel)}
                                    onActivate={openFullScreen}
                                    onFilterPath={setPathFilter}
                                />
                            </div>
                        </div>
                    </ViewPadding>
                </ResizablePanel>
                {selectedObject && (
                    <>
                        <ResizableHandle/>
                        <ResizablePanel defaultSize={detailSize} minSize={20} onResize={(s) => setSplitRatio(s / 100)}>
                            <CatalogDetail
                                object={selectedObject}
                                column={selectedColumn}
                                mode="embedded"
                                onToggleExpand={() => openFullScreen({objId: selectedObject.id, colName: selection?.colName})}
                                onClose={() => setSelection(null)}
                                onSelect={setSelection}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}
