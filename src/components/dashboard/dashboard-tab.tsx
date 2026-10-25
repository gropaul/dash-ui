import {useCallback, useEffect, useMemo} from "react";
import {shallow} from "zustand/shallow";
import {TElement} from "platejs";
import {useRelationsState} from "@/state/relations.state";
import {useGUIState} from "@/state/gui.state";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashQueryParam} from "@/state/routing/use-dash-location";
import {onRelationEvent} from "@/state/relations/event/relation-events";
import {refreshDownstreamRelations} from "@/state/relations/sql/relation-dag-refresh";
import {PageEditor, PageEditorMode} from "@/components/page-editor/page-editor";
import {FolderContents} from "@/components/workbench/folder-view";
import {createRelationBlock} from "@/components/page-editor/model";
import {sanitizeMacroName} from "@/platform/sql-utils";
import {PageLinks, PageLinksContext} from "@/components/page-editor/page-link-context";
import {allPages, relativePath, resolvePageLink} from "@/state/routing/page-links";
import {inputResolver} from "@/components/page-editor/page-tables";
import {Database} from "lucide-react";

export interface DashboardViewProps {
    dashboardId: string;
    /** The folder this page is the page of; its contents are listed below the page. */
    folderId?: string;
}

/** A dashboard is a page: its markdown is edited in the page editor and saved with the project's state. */
export function DashboardTab(props: DashboardViewProps) {
    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);
    const setDashboardMarkdown = useRelationsState((state) => state.setDashboardMarkdown);
    const tree = useRelationsState((state) => state.editorElements);

    // Links to other pages are paths relative to this one (state/routing/page-links.ts).
    const pageLinks = useMemo<PageLinks>(() => ({
        resolve: (url) => resolvePageLink(tree, props.dashboardId, url),
        pages: () => allPages(tree, props.dashboardId)
            .map(page => ({id: page.id, name: page.name, path: relativePath(tree, props.dashboardId, page.id) ?? ''})),
        href: (id) => DashNavigator.instance().getUrlFromObjectId(id),
        navigate: (id) => DashNavigator.instance().navigateToObjectId(id),
    }), [tree, props.dashboardId]);

    // `?readonly=1` opens the dashboard in view mode (shareable / deep-linkable); the other modes aren't in the URL.
    const readonly = useDashQueryParam("readonly") === "1";
    const onModeChange = useCallback((mode: PageEditorMode) => {
        DashNavigator.instance().setQueryParam("readonly", mode === 'view' ? "1" : null);
    }, []);

    // When a relation's query finishes or its selection changes, re-run the relations reading it (dependency
    // graph derived from SQL), so the relations the page shows follow each other. Mirrors the canvas' refresh.
    useEffect(() => onRelationEvent(
        (event) => { if (event.new) void refreshDownstreamRelations(event.new.id); },
        ["QUERY_RUN_FINISHED", "UPDATE_SELECTION"],
    ), []);

    // A block's `-- input: <path>.sql` names a query of the project by its path from this page.
    const relations = useRelationsState((state) => state.relations);
    const resolveInput = useMemo(() => inputResolver(tree, relations, props.dashboardId), [tree, relations, props.dashboardId]);

    // Picks a query of the project in the command palette and adds a block taking it in, named like it.
    const addMenuExtra = useCallback((insert: (node: TElement) => void) => [{
        label: 'Existing relation…',
        icon: Database,
        onSelect: () => useGUIState.getState().openCommand({
            action: 'add-relation-to-dashboard',
            filter: ['relations'],
            onSelect: (entity) => {
                const {editorElements, relations} = useRelationsState.getState();
                const path = relativePath(editorElements, props.dashboardId, entity.id);
                const name = sanitizeMacroName(relations[entity.id]?.viewState.displayName ?? '');
                if (path) insert(createRelationBlock('', {input: path}, undefined, name || undefined));
            },
        }),
    }], [props.dashboardId]);

    if (!dashboard) {
        return <div>Dashboard not found: {props.dashboardId}</div>;
    }

    return (
        <PageLinksContext.Provider value={pageLinks}>
            <PageEditor
                key={props.dashboardId}
                markdown={dashboard.markdown ?? ''}
                onMarkdownChange={(markdown) => setDashboardMarkdown(props.dashboardId, markdown)}
                mode={readonly ? 'view' : undefined}
                onModeChange={onModeChange}
                addMenuExtra={addMenuExtra}
                resolveInput={resolveInput}
                footer={props.folderId && <FolderContents folderId={props.folderId}/>}
            />
        </PageLinksContext.Provider>
    );
}
