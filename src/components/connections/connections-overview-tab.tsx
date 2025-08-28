'use client';
import {toast} from "sonner";
import React, {Fragment} from "react";
import {useDataSourcesState} from "@/state/data-sources.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {Button} from "@/components/ui/button";
import {Database, Plus, Upload} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {AttachDatabaseDialog, DialogResult} from "@/components/connections/attach-database-dialog";
import {ConnectionsService} from "@/state/connections/connections-service";
import {attachDatabase} from "@/state/data-source/duckdb-helper";
import {clearOPFS} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";
import {useGUIState} from "@/state/gui.state";
import {handleFileDrop} from "@/components/import/file-drop-relation/file-import";

const IS_DEBUG = process.env.NODE_ENV === 'development';

export function ConnectionsOverviewTab() {
    const connections = useDataSourcesState((state) => state.connections);

    const [isAttachDatabaseDialogOpen, setIsDatabaseDialogOpenInternal] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    function setAttachDatabaseDialogOpen(open: boolean) {
        setIsDatabaseDialogOpenInternal(open);
        useGUIState.getState().setRelationFileDropEnabled(!open);
    }
    function onAttachDatabaseClicked() {
        setAttachDatabaseDialogOpen(true);
    }

    function onUploadFilesClicked() {
        // Trigger the hidden file input
        fileInputRef.current?.click();
    }

    async function onFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files);
            await handleFileDrop(fileArray, (state) => {
                if (state.state === 'error') {
                    toast.error(state.message || 'Failed to upload files');
                } else if (state.state === 'done') {
                    toast.success(state.message || 'Files uploaded successfully');
                }
            });
            // Reset the file input
            event.target.value = '';
        }
    }

    async function onAttachDatabaseSubmit(result: DialogResult) {
        if (ConnectionsService.getInstance().hasDatabaseConnection()) {
            const db = ConnectionsService.getInstance().getDatabaseConnection();
            let fileName = '';
            if (result.url) {
                fileName = result.url;
            }
            if (result.file) {
                await db.mountFiles([result.file]);
                fileName = result.file.name;
            }

            if (!fileName) {
                toast.error('No file or URL provided.');
                return;
            }

            attachDatabase(fileName, (query) => db.executeQuery(query)).then(() => {
                toast.success(`Database ${fileName} attached successfully.`);
            }).catch((error) => {
                toast.error(`Failed to attach database from ${fileName}: ${error.message}`);
            });
        }
    }

    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="pl-4 pt-2.5 pr-3 pb-2 flex flex-row items-center justify-between overflow-hidden">
                <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">Data Sources
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant={'ghost'} size={'icon'} className={'h-8 w-8'}>
                            <Plus size={16}/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={onAttachDatabaseClicked}>
                            <Database size={16} className="mr-2"/>
                            <span>Attach Database</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onUploadFilesClicked}>
                            <Upload size={16} className="mr-2"/>
                            <span>Upload Files</span>
                        </DropdownMenuItem>
                        {IS_DEBUG && <DropdownMenuItem onClick={clearOPFS}>
                            <Database size={16} className="mr-2"/>
                            <span>Clear WASM OPFS</span>
                        </DropdownMenuItem>}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>


            {/* Scrollable Section */}
            <div className="flex-1 overflow-y-auto">
                <ul>
                    {Object.values(connections).map((connection, index) => {
                        return <Fragment key={index}>
                            <ConnectionView connection={connection} key={index}/>
                        </Fragment>;
                    })}
                </ul>
            </div>
            <AttachDatabaseDialog
                isOpen={isAttachDatabaseDialogOpen}
                onClose={() => setAttachDatabaseDialogOpen(false)}
                onSubmit={(result) => {
                    onAttachDatabaseSubmit(result);
                    setAttachDatabaseDialogOpen(false);
                }}
            />
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileInputChange}
                className="hidden"
                multiple
            />
        </div>
    );
}
