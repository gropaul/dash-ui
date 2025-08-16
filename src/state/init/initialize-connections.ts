import {findWorkingConnection} from "@/components/provider/config-utils";
import {DASH_DOMAIN} from "@/platform/global-data";
import {DBConnectionSpec, getDefaultSpec, specToConnection} from "@/state/connections/configs";
import {toast} from "sonner";
import {DatabaseConnection} from "@/model/database-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useDataSourcesState} from "@/state/data-sources.state";
import {getDuckDBInternalDatabase} from "@/state/data-source/duckdb-internal-databases";
import {getDuckDBLocalFilesystem} from "@/state/data-source/duckdb-local-filesystem";
import {useInitState} from "@/state/init.state";


// there will be only a connection returned if it was also successfully initialized
export async function tryInitializingConnectionFromHistory(history: DBConnectionSpec[]): Promise<DatabaseConnection | undefined> {
    // get the current url params to configure the connection
    const urlParams = new URLSearchParams(window.location.search);
    let connection = await findWorkingConnection(urlParams, history);

    // if there is a parameter k, it is a token for the connection. We have to remove
    // it from the url params to avoid being displayed all the time
    if (urlParams.has('k')) {
        urlParams.delete('k');
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, "", newUrl);
    }

    if (!connection) {

        // if the url of the page is on the default dash domain, use a wasm connection
        if (window.location.hostname === DASH_DOMAIN) {
            const spec = getDefaultSpec('duckdb-wasm');
            const wasmConnection = specToConnection(spec);
            const result = await wasmConnection.initialise();
            if (result.state === 'connected') {
                connection = wasmConnection;
                toast.info('No connection found. Using DuckDB WASM connection');
            }
        }
    }

    return connection;
}


export async function setDatabaseConnection(connection: DatabaseConnection): Promise<void> {

    useInitState.getState().addConnectionToHistory(connection);

    ConnectionsService.getInstance().setDatabaseConnection(connection);
    // add sources, but clear the previous ones
    const sourceState = useDataSourcesState.getState();
    sourceState.clearSourceConnections();

    // add the duckdb internal databases as data sources
    const duckdbInternalDatabases = await getDuckDBInternalDatabase(connection);
    await sourceState.addSourceConnection(duckdbInternalDatabases, true, true);

    if (connection.type in ['duckdb-over-http']) {
        // add the local file system over duckdb connection
        const fileSystemOverDuckdb = await getDuckDBLocalFilesystem();
        await sourceState.addSourceConnection(fileSystemOverDuckdb, true, true);
    }

}
