'use client';
import {toast} from "sonner";
import React, {Fragment} from "react";
import {useSourceConState} from "@/state/connections-source.state";
import {ConnectionView} from "@/components/connections/connection-view";
import {H5} from "@/components/ui/typography";
import {Button} from "@/components/ui/button";
import {Database, Folder, Plus} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {AttachDatabaseDialog, DialogResult} from "@/components/connections/attach-database-dialog";
import {ConnectionsService} from "@/state/connections-service";
import {attachDatabase} from "@/state/connections-source/duckdb-helper";
import {clearOPFS} from "@/state/connections-database/duckdb-wasm/connection-provider";

const IS_DEBUG = process.env.NODE_ENV === 'development';

export function ConnectionsOverviewTab() {
    const connections = useSourceConState((state) => state.connections);

    const [isAttachDatabaseDialogOpen, setAttachDatabaseDialogOpen] = React.useState(false);

    function onAttachDatabaseClicked() {
        setAttachDatabaseDialogOpen(true);
    }

    function onAttachDatabaseSubmit(result: DialogResult) {
        if (ConnectionsService.getInstance().hasDatabaseConnection()) {
            const db = ConnectionsService.getInstance().getDatabaseConnection();
            attachDatabase(result.url, (query) => db.executeQuery(query)).then(() => {
                toast.success(`Database ${result.url} attached successfully.`);
            }).catch((error) => {
                toast.error(`Failed to attach database from ${result.url}: ${error.message}`);
            });
        }
    }

    return (
        <div className="h-full w-full flex flex-col">
            {/* Header Section */}
            <div className="pl-4 pt-3 pr-3 pb-2 flex flex-row items-center justify-between overflow-hidden">
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
        </div>
    );
}
