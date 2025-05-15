import {Button} from "@/components/ui/button";
import {Download,} from "lucide-react";
import React, {useEffect} from "react";
import {ConnectionsService} from "@/state/connections-service";
import {DuckDBWasm} from "@/state/connections-database/duckdb-wasm";


export function ExportDatabaseButton() {

    const [showButton, setShowButton] = React.useState(false);
    useEffect(() => {
        ConnectionsService.getInstance().onDatabaseConnectionChange(
            (connection) => {
                if (connection) {
                    if (connection.type === 'duckdb-wasm-motherduck' || connection.type === 'duckdb-wasm') {
                        setShowButton(true);
                    } else {
                        setShowButton(false);
                    }
                } else {
                    setShowButton(false);
                }
            }
        )
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