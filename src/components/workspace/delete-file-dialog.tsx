import {create} from "zustand";
import {DeleteDialog} from "@/components/workbench/delete-dialog";

interface DeleteRequest {
    title: string;
    description: string;
    onDelete: () => Promise<void> | void;
}

const useDeleteFileDialog = create<{ request: DeleteRequest | null }>(() => ({request: null}));

export function confirmDelete(request: DeleteRequest) {
    useDeleteFileDialog.setState({request});
}

export function DeleteFileDialog() {
    const request = useDeleteFileDialog(s => s.request);
    return (
        <DeleteDialog
            isOpen={!!request}
            title={request?.title}
            description={request?.description}
            onOpenChange={open => !open && useDeleteFileDialog.setState({request: null})}
            onDelete={() => void request?.onDelete()}
        />
    );
}
