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
import {getCreateDialogTitle, getRenameDialogDescription, getRenameDialogTitle, useRenameDialogStore} from "@/state/rename-dialog.state";
import {checkMacroName, findMacroReferences, getMacroName} from "@/state/relations/sql/table-macros";
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {isPageBlock, otherPageBlocks} from "@/state/relations/sql/page-refs";
import {useRelationsState} from "@/state/relations.state";
import {callsRefInMarkdown} from "@/model/dashboard-state";
import {sanitizeMacroName} from "@/platform/sql-utils";
import {callsRef} from "@/platform/sql-refs";
import {pageNameError, partnerOf} from "@/state/routing/page-links";

// A page block's name is what other blocks write in refs.<name>(), so it must be one as it stands.
const BLOCK_NAME = /^[a-z_][a-z0-9_]*$/;

function MacroInfo({currentMacroName, newMacroName, references, updateReferences, onUpdateReferencesChange}: {
    currentMacroName: string;
    newMacroName: string;
    /** Where the macro is called, e.g. "Sales (query)". */
    references: string[];
    updateReferences: boolean;
    onUpdateReferencesChange: (checked: boolean) => void;
}) {
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
                            Update {references.length} reference{references.length > 1 ? 's' : ''}
                        </label>
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground">
                        {references.map((ref, i) => (
                            <li key={i} className="text-xs">{ref}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function RenameDialog() {
    const isOpen = useRenameDialogStore((s) => s.isOpen);
    const mode = useRenameDialogStore((s) => s.mode);
    const entityType = useRenameDialogStore((s) => s.entityType);
    const entityId = useRenameDialogStore((s) => s.entityId);
    const currentName = useRenameDialogStore((s) => s.currentName);
    const onCreate = useRenameDialogStore((s) => s.onCreate);
    const confirmRename = useRenameDialogStore((s) => s.confirmRename);
    const close = useRenameDialogStore((s) => s.close);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const [newName, setNewName] = React.useState('');
    const [updateReferences, setUpdateReferences] = React.useState(true);
    const [macroError, setMacroError] = React.useState<string | null>(null);
    const [isValidating, setIsValidating] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setNewName(currentName ?? '');
            setUpdateReferences(true);
            setMacroError(null);
            setIsValidating(false);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [isOpen]);

    // Compute macro info locally for relations (rename mode only)
    const isRelation = entityType === 'relations';
    const isBlock = isRelation && mode === 'rename' && !!entityId && isPageBlock(entityId);
    const refOf = (name: string) => isBlock ? `refs.${name}` : getMacroName(name);
    const macroName = mode === 'rename' && isRelation && currentName ? refOf(currentName) : undefined;
    const macroReferences = React.useMemo(() => {
        if (mode !== 'rename' || !isRelation || !currentName || !entityId) return [];
        if (isBlock) {
            return otherPageBlocks(entityId)
                .filter(r => callsRef(r.query.baseQuery, currentName))
                .map(r => `${r.viewState.displayName} (block)`);
        }
        const name = sanitizeMacroName(currentName);
        const dashboards = Object.values(useRelationsState.getState().dashboards);
        return [
            ...findMacroReferences(name, entityId).map(e => `${e.relation.viewState.displayName} (query)`),
            ...dashboards.filter(d => callsRefInMarkdown(d.markdown ?? '', name)).map(d => `${d.viewState.displayName} (dashboard)`),
        ];
    }, [mode, isRelation, isBlock, currentName, entityId]);

    const title = mode === 'create' ? getCreateDialogTitle(entityType) : getRenameDialogTitle(entityType);
    const description = mode === 'create' ? undefined : getRenameDialogDescription(entityType, currentName);

    const trimmedName = newName.trim();

    const blockError = !isBlock || !trimmedName ? undefined
        : !BLOCK_NAME.test(trimmedName) ? 'A block name is a lowercase SQL identifier, e.g. sales_by_region.'
        : trimmedName !== currentName && otherPageBlocks(entityId!).some(r => r.viewState.displayName === trimmedName)
            ? `Another block on the page is named ${trimmedName}.`
            : undefined;

    // Check for macro name conflict with other relations
    const macroConflict = React.useMemo(() => {
        if (!isRelation || isBlock || !trimmedName) return undefined;
        const newMacroName = getMacroName(trimmedName);
        // In rename mode, skip if the name is unchanged
        if (mode === 'rename' && macroName && newMacroName === macroName) return undefined;
        const conflict = getAllRelations().find(
            e => (mode === 'create' || e.relation.id !== entityId)
              && getMacroName(e.relation.viewState.displayName) === newMacroName
        );
        return conflict?.relation.viewState.displayName;
    }, [isRelation, isBlock, mode, macroName, trimmedName, entityId]);

    // Pages, folders and queries become files and folders, named as they are; a folder and its page share the
    // new name.
    const tree = useRelationsState.getState().editorElements;
    const partner = mode === 'rename' && entityId ? partnerOf(tree, entityId) : undefined;
    const pageError = (entityType === 'dashboards' || entityType === 'folder' || isRelation && !isBlock) && trimmedName
        ? pageNameError(tree, entityId ?? '', trimmedName) ?? (partner && pageNameError(tree, partner.id, trimmedName))
        : undefined;

    const isValid = trimmedName.length > 0 && !macroConflict && !blockError && !pageError && !isValidating;

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
        if (mode === 'create' && onCreate) {
            onCreate(trimmedName);
            close();
        } else {
            confirmRename(trimmedName, updateReferences);
        }
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
                        ref={inputRef}
                        placeholder="Enter a name"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setMacroError(null); }}
                    />
                    {isRelation && trimmedName.length > 0 && (
                        <MacroInfo
                            currentMacroName={mode === 'create' ? refOf(trimmedName) : macroName!}
                            newMacroName={refOf(trimmedName)}
                            references={mode === 'create' ? [] : macroReferences}
                            updateReferences={updateReferences}
                            onUpdateReferencesChange={setUpdateReferences}
                        />
                    )}
                    {macroConflict && (
                        <p className="text-sm text-destructive">
                            Macro name conflicts with &quot;{macroConflict}&quot;
                        </p>
                    )}
                    {pageError && (
                        <p className="text-sm text-destructive">{pageError}</p>
                    )}
                    {blockError && (
                        <p className="text-sm text-destructive">{blockError}</p>
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
                            {mode === 'create' ? 'Create' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
