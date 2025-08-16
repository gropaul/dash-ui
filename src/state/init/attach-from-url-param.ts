import {decompressString} from "@/lib/string-compression";
import {getImportQuery} from "@/state/connections/duckdb-wasm/utils";
import {ConnectionsService} from "@/state/connections/connections-service";
import {getDashStateIfExits} from "@/components/import/file-drop-relation/database-import";
import {useRelationsState} from "@/state/relations.state";
import {toast} from "sonner";


export async function maybeAttachDatabaseFromUrlParam(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    // if the url params have an attach value, load the value and parse it
    console.log(urlParams);
    if (urlParams.has('attach')) {
        const attach = urlParams.get('attach');
        if (attach && ConnectionsService.getInstance().hasDatabaseConnection()) {
            const decodedDatabaseUrl = decompressString(attach);
            const connection = ConnectionsService.getInstance().getDatabaseConnection();

            const fileName = decodedDatabaseUrl.split('/').pop() || 'database.duckdb';
            // remove the file extension from the file name (database.duckdb -> database)
            const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
            const query = await getImportQuery( decodedDatabaseUrl, fileNameWithoutExtension,'database', true);
            await ConnectionsService.getInstance().getDatabaseConnection().executeQuery(query);
            const dashState = await getDashStateIfExits(connection, fileNameWithoutExtension);
            if (dashState) {
                useRelationsState.getState().mergeState(dashState, true);
            }
            toast.success(`Database ${fileName} attached successfully.`);
        }
    }
}