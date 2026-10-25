import React from "react";
import {create} from "zustand";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

interface NameRequest {
    title: string;
    /** Shown below the title, e.g. what else the change updates. */
    description?: string;
    initial?: string;
    submitLabel?: string;
    /** The file the name becomes, shown below the field ("Will be saved as orders.sql"), if it differs. */
    savedAs?: (name: string) => string | undefined;
    /** Why the name can't be used, if it can't. */
    validate: (name: string) => string | undefined;
    onSubmit: (name: string) => Promise<void> | void;
}

const useNameDialog = create<{ request: NameRequest | null }>(() => ({request: null}));

/** Asks for a name in a dialog: for a new file or folder, or to rename one. */
export function askForName(request: NameRequest) {
    useNameDialog.setState({request});
}

export function NameDialog() {
    const request = useNameDialog(s => s.request);
    const [name, setName] = React.useState('');
    const [submitError, setSubmitError] = React.useState<string>();

    React.useEffect(() => {
        setName(request?.initial ?? '');
        setSubmitError(undefined);
    }, [request]);

    const close = () => useNameDialog.setState({request: null});
    const trimmed = name.trim();
    const error = request && trimmed ? request.validate(trimmed) : undefined;
    const savedAs = request && trimmed && !error ? request.savedAs?.(trimmed) : undefined;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!request || !trimmed || error) return;
        try {
            await request.onSubmit(trimmed);
            close();
        } catch (e) {
            setSubmitError((e as Error).message);
        }
    }

    return (
        <Dialog open={!!request} onOpenChange={open => !open && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{request?.title}</DialogTitle>
                    {request?.description && <DialogDescription className="whitespace-pre-line">{request.description}</DialogDescription>}
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <Input autoFocus placeholder="Enter a name" value={name}
                           onChange={e => {
                               setName(e.target.value);
                               setSubmitError(undefined);
                           }}/>
                    {savedAs && (
                        <p className="text-sm text-muted-foreground">
                            Will be saved as <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{savedAs}</code>
                        </p>
                    )}
                    {(error ?? submitError) && <p className="text-sm text-destructive">{error ?? submitError}</p>}
                    <DialogFooter>
                        <Button variant="secondary" type="button" onClick={close}>Cancel</Button>
                        <Button type="submit" disabled={!trimmed || !!error}>{request?.submitLabel ?? 'Create'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
