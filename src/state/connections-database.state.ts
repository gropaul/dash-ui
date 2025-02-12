import {DatabaseConnection} from "@/model/database-connection";
import {ConnectionsService} from "@/state/connections-service";
import {createWithEqualityFn} from "zustand/traditional";
import {useSourceConState} from "@/state/connections-source.state";
import {DuckDBOverHttpConfig, getDuckDBLocalConnection} from "@/state/connections-database/duckdb-over-http";
import {getDuckDBInternalDatabase} from "@/state/connections-source/duckdb-internal-databases";
import {getDuckDBLocalFilesystem} from "@/state/connections-source/duckdb-local-filesystem";
import {DBConnectionSpec} from "@/state/connections-database/configs";
import {createJSONStorage, persist} from "zustand/middleware";


export interface DatabaseConnectionZustand {
    history: DBConnectionSpec[];
    initialiseDBConnection: (spec: DBConnectionSpec) => Promise<void>;
    setDatabaseConnection: (connection: DatabaseConnection) => Promise<void>;
}


const storage = createJSONStorage(() => localStorage, {
    reviver: (key, value) => {
        return value;
    },
    replacer: (key, value) => {
        return value;
    }
});


export const useDatabaseConState = createWithEqualityFn<DatabaseConnectionZustand>()(
    persist(
        (set, get) => ({
            history: [],
            initialiseDBConnection: async (spec) => {
                let connection: DatabaseConnection;
                switch (spec.type) {
                    case "duckdb-over-http":
                        connection = getDuckDBLocalConnection(spec.config as DuckDBOverHttpConfig);
                        break;
                    default:
                        throw new Error('Unknown database type');
                }
                await get().setDatabaseConnection(connection);
                console.log('DuckDB Local connection initialised');

                // add sources
                const sourceState = useSourceConState.getState();
                // add the duckdb internal databases as data sources
                const duckdbInternalDatabases = await getDuckDBInternalDatabase();
                await sourceState.addSourceConnection(duckdbInternalDatabases, true, true);

                // add the local file system over duckdb connection
                const fileSystemOverDuckdb = await getDuckDBLocalFilesystem();
                await sourceState.addSourceConnection(fileSystemOverDuckdb, true, true);


            },
            setDatabaseConnection: async (connection) => {
                ConnectionsService.getInstance().setDatabaseConnection(connection);

                // add this connection to the history. The newest connection is always at the beginning
                const history_copy = [...get().history];
                const new_element: DBConnectionSpec = {type: connection.type, config: connection.config as any};
                // if there is already an element with the same config, remove it
                const index = history_copy.findIndex((element) => {
                    return JSON.stringify(element) === JSON.stringify(new_element);
                });
                if (index !== -1) {
                    history_copy.splice(index, 1);
                }
                // if there are more than 10 elements, remove the last one
                if (history_copy.length > 10) {
                    history_copy.pop();
                }

                // add the new element at the beginning
                history_copy.unshift(new_element);
                set({history: history_copy});
            },
        }),
        {
            name: "gui-state", // The key used in localStorage
            storage: storage,
        }
    )
);




