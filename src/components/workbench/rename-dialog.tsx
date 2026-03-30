import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import React from "react";
import {getRenameDialogDescription, getRenameDialogTitle, useRenameDialogStore} from "@/state/rename-dialog.state";
import {getMacroName, MacroReference} from "@/state/relations/sql/table-macros";

function MacroInfo({currentMacroName, newName, references}: {
    currentMacroName: string;
    newName: string;
    references: MacroReference[];
}) {
    const newMacroName = getMacroName(newName);
    const macroChanged = currentMacroName !== newMacroName;

    return (
        <div className="text-sm space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
                <span>Macro:</span>
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                    {currentMacroName}
                </code>
                {macroChanged && (
                    <>
                        <span>&rarr;</span>
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
                            {newMacroName}
                        </code>
                    </>
                )}
            </div>
            {references.length > 0 && (
                <div className="rounded-md border p-2 space-y-1">
                    <p className="text-muted-foreground font-medium">
                        Referenced by {references.length} relation{references.length > 1 ? 's' : ''}:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground">
                        {references.map((ref) => (
                            <li key={ref.relation.relation.id} className="text-xs">
                                <span>{ref.relation.relation.viewState.displayName}</span>
                                <span className="text-muted-foreground/60 ml-1">({ref.relation.origin})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function RenameDialog() {
    const isOpen = useRenameDialogStore((s) => s.isOpen);
    const entityType = useRenameDialogStore((s) => s.entityType);
    const currentName = useRenameDialogStore((s) => s.currentName);
    const macroName = useRenameDialogStore((s) => s.macroName);
    const macroReferences = useRenameDialogStore((s) => s.macroReferences);
    const confirmRename = useRenameDialogStore((s) => s.confirmRename);
    const close = useRenameDialogStore((s) => s.close);

    const [newName, setNewName] = React.useState(currentName ?? '');

    React.useEffect(() => {
        setNewName(currentName ?? '');
    }, [currentName]);

    const title = getRenameDialogTitle(entityType);
    const description = getRenameDialogDescription(entityType, currentName);

    function handleRename() {
        confirmRename(newName);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        handleRename();
    }

    const isRelation = entityType === 'relations' && macroName;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        placeholder="Enter new name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    {isRelation && (
                        <MacroInfo
                            currentMacroName={macroName}
                            newName={newName}
                            references={macroReferences}
                        />
                    )}
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={close}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Confirm
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
