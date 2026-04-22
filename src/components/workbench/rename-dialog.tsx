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
import {Loader2} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import React from "react";
import {getRenameDialogDescription, getRenameDialogTitle, useRenameDialogStore} from "@/state/rename-dialog.state";
import {checkMacroName, findMacroReferences, getMacroName, MacroReference} from "@/state/relations/sql/table-macros";
import {getAllRelations} from "@/state/relations/all-relation-utils";

function MacroInfo({currentMacroName, newName, references, updateReferences, onUpdateReferencesChange}: {
    currentMacroName: string;
    newName: string;
    references: MacroReference[];
    updateReferences: boolean;
    onUpdateReferencesChange: (checked: boolean) => void;
}) {
    const newMacroName = getMacroName(newName);
    const macroChanged = currentMacroName !== newMacroName;

    return (
        <div className="text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <span>Macro:</span>
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs break-all">
                    {currentMacroName}
                </code>
                {macroChanged && (
                    <>
                        <span>&rarr;</span>
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs break-all">
                            {newMacroName}
                        </code>
                    </>
                )}
            </div>
            {references.length > 0 && macroChanged && (
                <div className="rounded-md border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="update-references"
                            checked={updateReferences}
                            onCheckedChange={(checked) => onUpdateReferencesChange(checked === true)}
                        />
                        <label htmlFor="update-references" className="text-sm cursor-pointer">
                            Update {references.length} reference{references.length > 1 ? 's' : ''} in other queries
                        </label>
                    </div>
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
    const entityId = useRenameDialogStore((s) => s.entityId);
    const currentName = useRenameDialogStore((s) => s.currentName);
    const confirmRename = useRenameDialogStore((s) => s.confirmRename);
    const close = useRenameDialogStore((s) => s.close);

    const [newName, setNewName] = React.useState(currentName ?? '');
    const [updateReferences, setUpdateReferences] = React.useState(true);
    const [macroError, setMacroError] = React.useState<string | null>(null);
    const [isValidating, setIsValidating] = React.useState(false);

    React.useEffect(() => {
        setNewName(currentName ?? '');
        setUpdateReferences(true);
        setMacroError(null);
    }, [currentName]);

    // Compute macro info locally for relations
    const isRelation = entityType === 'relations';
    const macroName = React.useMemo(
        () => isRelation && currentName ? getMacroName(currentName) : undefined,
        [isRelation, currentName]
    );
    const macroReferences = React.useMemo(
        () => macroName && entityId ? findMacroReferences(macroName, entityId) : [],
        [macroName, entityId]
    );

    const title = getRenameDialogTitle(entityType);
    const description = getRenameDialogDescription(entityType, currentName);

    const trimmedName = newName.trim();

    // Check for macro name conflict with other relations
    const macroConflict = React.useMemo(() => {
        if (!macroName || !trimmedName) return undefined;
        const newMacroName = getMacroName(trimmedName);
        if (newMacroName === macroName) return undefined;
        const conflict = getAllRelations().find(
            e => e.relation.id !== entityId && getMacroName(e.relation.viewState.displayName) === newMacroName
        );
        if (!conflict) return undefined;
        return conflict.relation.viewState.displayName;
    }, [macroName, trimmedName, entityId]);

    const isValid = trimmedName.length > 0 && !macroConflict && !isValidating;

    async function handleRename() {
        if (!isValid) return;
        if (isRelation) {
            setIsValidating(true);
            const error = await checkMacroName(trimmedName);
            setIsValidating(false);
            if (error) {
                setMacroError(error);
                return;
            }
        }
        setMacroError(null);
        confirmRename(trimmedName, macroName, updateReferences);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        handleRename();
    }

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
                        onChange={(e) => { setNewName(e.target.value); setMacroError(null); }}
                    />
                    {macroName && (
                        <MacroInfo
                            currentMacroName={macroName}
                            newName={newName}
                            references={macroReferences}
                            updateReferences={updateReferences}
                            onUpdateReferencesChange={setUpdateReferences}
                        />
                    )}
                    {macroConflict && (
                        <p className="text-sm text-destructive">
                            Macro name conflicts with &quot;{macroConflict}&quot;
                        </p>
                    )}
                    {macroError && (
                        <p className="text-sm text-destructive">{macroError}</p>
                    )}
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={close}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isValid}>
                            {isValidating && <Loader2 className="animate-spin" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
