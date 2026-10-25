import {useCallback, useMemo} from "react";
import {TElement} from "platejs";
import {Database} from "lucide-react";
import {useGUIState} from "@/state/gui.state";
import {DashNavigator} from "@/state/routing/navigation";
import {useDashQueryParam} from "@/state/routing/use-dash-location";
import {useFile, useFilePaths, useWorkspace} from "@/state/workspace/workspace.state";
import {pageLinkTarget} from "@/state/workspace/page-text";
import {relativePath} from "@/state/workspace/paths";
import {displayName, isPage} from "@/state/workspace/workspace-tree";
import {PageEditor, PageEditorMode} from "@/components/page-editor/page-editor";
import {createRelationBlock} from "@/components/page-editor/model";
import {PageLinks, PageLinksContext} from "@/components/page-editor/page-link-context";

/** A `.md` file of the workspace, edited in the page editor. */
export function PageTab({path}: { path: string }) {
    const markdown = useFile(path) ?? '';
    const paths = useFilePaths();

    // Links to other pages are paths relative to this one.
    const pageLinks = useMemo<PageLinks>(() => {
        const pages = new Set(paths.filter(isPage));
        return {
            resolve: (url) => {
                const target = pageLinkTarget(path, url);
                return target && pages.has(target) ? {id: target, name: displayName(target)} : undefined;
            },
            pages: () => [...pages].filter(p => p !== path).map(p => ({id: p, name: displayName(p), path: relativePath(path, p)})),
            href: (id) => DashNavigator.instance().getUrlFromPath(id),
            navigate: (id) => DashNavigator.instance().navigateToPath(id),
        };
    }, [paths, path]);

    // `?readonly=1` opens the page in view mode (shareable / deep-linkable); the other modes aren't in the URL.
    const readonly = useDashQueryParam("readonly") === "1";
    const onModeChange = useCallback((mode: PageEditorMode) => {
        DashNavigator.instance().setQueryParam("readonly", mode === 'view' ? "1" : null);
    }, []);

    const onMarkdownChange = useCallback((next: string) => {
        void useWorkspace.getState().write(path, next);
    }, [path]);

    // Picks a query of the project in the command palette and adds a block taking it in.
    const addMenuExtra = useCallback((insert: (node: TElement) => void) => [{
        label: 'Existing query…',
        icon: Database,
        onSelect: () => useGUIState.getState().openCommand({
            action: 'add-query-to-page',
            filter: ['query'],
            onSelect: (file) => insert(createRelationBlock('', {input: relativePath(path, file.path)})),
        }),
    }], [path]);

    return (
        <PageLinksContext.Provider value={pageLinks}>
            <PageEditor
                key={path}
                path={path}
                markdown={markdown}
                onMarkdownChange={onMarkdownChange}
                mode={readonly ? 'view' : undefined}
                onModeChange={onModeChange}
                addMenuExtra={addMenuExtra}
            />
        </PageLinksContext.Provider>
    );
}
