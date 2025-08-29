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
import {FilepathDialogState, FilepathDialog, FilepathDialogProps} from "@/components/export/filepath-dialog";
import {useState} from "react";
import {exportQueryToFile, FileFormat} from "@/state/data-source/duckdb-helper";
import {useRelationsState} from "@/state/relations.state";
import {toast} from "sonner";


interface HeaderDownloadButtonProps extends FilepathDialogProps{

}


export function HeaderDownloadButton(props: HeaderDownloadButtonProps) {

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
                <HeaderDownloadButtonContent
                    state={props.state}
                    setState={props.setState}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    </>

}

export function HeaderDownloadButtonContent(props: HeaderDownloadButtonProps) {

    function onExportAsClicked(format: FileFormat) {
        props.setState({
            ...props.state,
            open: true,
            fileFormat: format
        })
    }

    return <>

        <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onExportAsClicked('csv')}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportAsClicked('json')}>JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportAsClicked('xlsx')}>Excel</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportAsClicked('parquet')}>Parquet</DropdownMenuItem>
        </DropdownMenuGroup>
    </>
}