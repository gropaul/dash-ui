import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Download} from "lucide-react";
import {FilepathDialog} from "@/components/export/filepath-dialog";
import {useState} from "react";
import {exportQueryToFile, FileFormat} from "@/state/connections/duckdb-helper";
import {useRelationsState} from "@/state/relations.state";
import {toast} from "sonner";


interface HeaderDownloadButtonProps {
    relationId: string;
}

interface DialogState {
    open: boolean;
    fileFormat: FileFormat
}

export function HeaderDownloadButton(props: HeaderDownloadButtonProps) {

    const [dialogState, setDialogState] = useState<DialogState>({open: false, fileFormat: 'csv'});

    async function onPathSelected(path: string) {
        const relation = useRelationsState.getState().getRelation(props.relationId);
        const query = relation.query.baseQuery;

        // Close the dialog
        setDialogState({ ...dialogState, open: false });

        // Show exporting toast with loading indicator
        const toastId = toast.loading('Exporting file to ' + path, { duration: 0 });

        try {
            await exportQueryToFile(query, path, dialogState.fileFormat);
            // Update the same toast to success
            toast.success(`Exported result to ${path}`, { id: toastId, duration: 2000 });
        } catch (e: any) {
            // Update the same toast to error
            toast.error('Failed to export query to file: ' + e.message, { id: toastId });
        }
    }

    function onDialogOpenChange(open: boolean) {
        setDialogState({
            ...dialogState,
            open: open,
        })
    }

    function onExportAsClicked(format: FileFormat) {
        setDialogState({
            open: true,
            fileFormat: format
        })
    }

    return <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={'ghost'} size={'icon'}>
                    <Download className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32">
                <DropdownMenuLabel>Export as ... </DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => onExportAsClicked('csv')}>CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportAsClicked('json')}>JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportAsClicked('xlsx')}>Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExportAsClicked('parquet')}>Parquet</DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
        <FilepathDialog
            onFilePathSelected={onPathSelected}
            onOpenChange={onDialogOpenChange}
            open={dialogState.open}
            fileFormat={dialogState.fileFormat}
        />
    </>

}