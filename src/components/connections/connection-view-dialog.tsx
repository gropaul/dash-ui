import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ConnectionConfig} from "@/components/connections/connection-config";
import {ConnectionHistory} from "@/components/connections/connection-history";
import {toast} from "sonner";
import {useEffect, useState} from "react";
import {
    connectionToSpec,
    DBConnectionSpec,
    getDefaultSpec,
    specToConnection
} from "@/state/connections-database/configs";
import {useDatabaseConState} from "@/state/connections-database.state";
import {ConnectionsService} from "@/state/connections-service";


export interface ConnectionViewDialogProps {
    open: boolean;
    forceOpen?: boolean;
    onOpenChange: (open: boolean) => void;
    onSpecSave?: (spec: DBConnectionSpec) => void;
}

export function getCurrentSpec(): DBConnectionSpec {
    if (ConnectionsService.getInstance().hasDatabaseConnection()) {
        const connection = ConnectionsService.getInstance().getDatabaseConnection();
        return connectionToSpec(connection);
    } else {
        return getDefaultSpec();
    }
}

export function ConnectionViewDialog(props: ConnectionViewDialogProps) {

    const [currentSpec, setCurrentSpec] = useState<DBConnectionSpec>(getCurrentSpec());

    // reload the current spec when the dialog is opened
    useEffect(() => {
        setCurrentSpec(getCurrentSpec());
    }, [props.open]);

    function onLocalOpenChange(open: boolean) {
        if (props.forceOpen) {
            toast.error('You have to configure a connection before you can continue');
        }
        if (!open && !props.forceOpen) {
            props.onOpenChange(open);
        }
    }

    return (
        <Dialog open={props.open} onOpenChange={onLocalOpenChange}>
            <DialogContent
                className={'flex flex-col max-h-[calc(100vh-64px)] overflow-y-auto gap-0'}
            >
                <DialogHeader>
                    <DialogTitle>Configure DuckDB Connection</DialogTitle>
                    <DialogDescription>
                        Configure how you would like to use DuckDB.
                    </DialogDescription>
                </DialogHeader>
                <div className={'flex flex-col gap-4'}>
                    <ConnectionHistory
                        onSpecSelected={setCurrentSpec}
                    />
                    <ConnectionConfig
                        spec={currentSpec}
                        onSpecChange={setCurrentSpec}
                        onSpecSave={props.onSpecSave}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}