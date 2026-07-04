import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {create} from "zustand";
import {getRelationDependencies, RelationDependencies} from "@/state/relations/relation-dependencies";
import {LayoutDashboard, Workflow} from "lucide-react";

type DeleteMode =
    | 'confirm-with-deps'   // deleting from sidebar, has dependencies
    | 'confirm-no-deps'     // deleting from sidebar, no dependencies
    | 'offer-full-delete';  // removed last reference, offer to delete entirely

interface RelationDeleteDialogState {
    isOpen: boolean;
    relationId: string | null;
    relationName: string;
    mode: DeleteMode;
    dependencies: RelationDependencies | null;
    onConfirmDelete: (() => void) | null;
    onCancel: (() => void) | null;

    /**
     * Open the dialog for deleting a relation from the sidebar.
     * Shows dependencies if any exist.
     */
    openForSidebarDelete: (relationId: string, relationName: string, onConfirm: () => void) => void;

    /**
     * Open the dialog after removing the last reference to a relation
     * (e.g., removing the last canvas node or dashboard block that referenced it).
     * Offers to delete the relation entirely.
     */
    openForOrphanDelete: (relationId: string, relationName: string, onConfirm: () => void, onCancel?: () => void) => void;

    close: () => void;
}

export const useRelationDeleteDialog = create<RelationDeleteDialogState>((set) => ({
    isOpen: false,
    relationId: null,
    relationName: '',
    mode: 'confirm-no-deps',
    dependencies: null,
    onConfirmDelete: null,
    onCancel: null,

    openForSidebarDelete: (relationId, relationName, onConfirm) => {
        const deps = getRelationDependencies(relationId);
        set({
            isOpen: true,
            relationId,
            relationName,
            mode: deps.totalRefs > 0 ? 'confirm-with-deps' : 'confirm-no-deps',
            dependencies: deps,
            onConfirmDelete: onConfirm,
            onCancel: null,
        });
    },

    openForOrphanDelete: (relationId, relationName, onConfirm, onCancel) => {
        set({
            isOpen: true,
            relationId,
            relationName,
            mode: 'offer-full-delete',
            dependencies: null,
            onConfirmDelete: onConfirm,
            onCancel: onCancel ?? null,
        });
    },

    close: () => set({
        isOpen: false,
        relationId: null,
        onConfirmDelete: null,
        onCancel: null,
    }),
}));


export function RelationDeleteDialog() {
    const {isOpen, relationName, mode, dependencies, onConfirmDelete, onCancel, close} = useRelationDeleteDialog();

    function handleDelete() {
        onConfirmDelete?.();
        close();
    }

    function handleCancel() {
        onCancel?.();
        close();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
            <DialogContent>
                {mode === 'confirm-with-deps' && dependencies && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Delete &quot;{relationName}&quot;?</DialogTitle>
                            <DialogDescription>
                                This relation is still referenced in the following places. Deleting it will remove it everywhere.
                            </DialogDescription>
                        </DialogHeader>
                        <DependencyList dependencies={dependencies}/>
                        <DialogFooter>
                            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete Everywhere</Button>
                        </DialogFooter>
                    </>
                )}

                {mode === 'confirm-no-deps' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Delete &quot;{relationName}&quot;?</DialogTitle>
                            <DialogDescription>
                                This relation is not referenced by any canvas or dashboard. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </DialogFooter>
                    </>
                )}

                {mode === 'offer-full-delete' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Delete &quot;{relationName}&quot;?</DialogTitle>
                            <DialogDescription>
                                This relation is no longer referenced by any canvas or dashboard. Do you want to delete it completely?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="secondary" onClick={handleCancel}>Keep</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}


function DependencyList({dependencies}: { dependencies: RelationDependencies }) {
    return (
        <div className="space-y-1 text-sm">
            {dependencies.canvases.map(c => (
                <div key={c.canvasId} className="flex items-center gap-2 text-muted-foreground">
                    <Workflow size={14}/>
                    <span>{c.canvasName}</span>
                    {c.nodeIds.length > 1 && (
                        <span className="text-xs">({c.nodeIds.length} nodes)</span>
                    )}
                </div>
            ))}
            {dependencies.dashboards.map(d => (
                <div key={d.dashboardId} className="flex items-center gap-2 text-muted-foreground">
                    <LayoutDashboard size={14}/>
                    <span>{d.dashboardName}</span>
                    {d.widgetIds.length > 1 && (
                        <span className="text-xs">({d.widgetIds.length} widgets)</span>
                    )}
                </div>
            ))}
        </div>
    );
}
