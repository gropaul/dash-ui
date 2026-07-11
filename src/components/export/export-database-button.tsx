import {DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {Download,} from "lucide-react";
import React, {useEffect} from "react";
import {ConnectionsService} from "@/state/connections/connections-service";
import {DuckDBWasm} from "@/state/connections/duckdb-wasm";
import {DatabaseConnection} from "@/model/database-connection";
import {getStorageMode} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";


function shouldShowExportButton(connection?: DatabaseConnection): boolean {
    if (connection) {
        const isWasm = connection.type === 'duckdb-wasm-motherduck' || connection.type === 'duckdb-wasm';
        return isWasm && getStorageMode() !== 'memory';
    } else {
        return false;
    }
}

// Renders as a dropdown menu item (used in the app-bar overflow menu). Renders nothing when
// export isn't applicable (non-WASM or in-memory storage).
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
        <DropdownMenuItem onClick={onButtonClick}>
            <Download className="mr-2 h-4 w-4"/> Download Database
        </DropdownMenuItem>
    )
}