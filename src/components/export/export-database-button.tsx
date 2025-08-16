import {Button} from "@/components/ui/button";
import {Download,} from "lucide-react";
import React, {useEffect} from "react";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";


function shouldShowExportButton(connection?: DatabaseConnection): boolean {
    console.log('ExportDatabaseButton: onDatabaseConnectionChange', connection);
    if (connection) {
        return connection.type === 'duckdb-wasm-motherduck' || connection.type === 'duckdb-wasm';
    } else {
        return false;
    }
}

export function ExportDatabaseButton() {



    const [showButton, setShowButton] = React.useState(false);
    useEffect(() => {
        ConnectionsService.getInstance().onDatabaseConnectionChange(
            (connection) => {
                const shouldShow = shouldShowExportButton(connection);
                setShowButton(shouldShow);
            }
        )
        // initial check
        const service = ConnectionsService.getInstance();
        if (service.hasDatabaseConnection()) {
            const connection = service.getDatabaseConnection();
            const shouldShow = shouldShowExportButton(connection);
            setShowButton(shouldShow);
        } else {
            setShowButton(false);
        }

    }, []);

    if (!showButton) {
        return null;
    }

    async function onButtonClick() {
        const service = ConnectionsService.getInstance();
        if (service.hasDatabaseConnection()) {
            const connection = service.getDatabaseConnection();
            // cast to duckdb-wasm
            const duckdb = connection as DuckDBWasm;
            await duckdb.downloadDatabase();
        }
    }

    return (
        <Button variant={'ghost'} size={'icon'} onClick={onButtonClick}>
            <Download/>
        </Button>
    )
}