import {DatabaseConnection} from "@/model/database-connection";
import {ConnectionsService} from "@/state/connections-service";
import {createWithEqualityFn} from "zustand/traditional";
import {useSourceConState} from "@/state/connections-source.state";
import {getDuckDBInternalDatabase} from "@/state/connections-source/duckdb-internal-databases";
import {getDuckDBLocalFilesystem} from "@/state/connections-source/duckdb-local-filesystem";
import {DBConnectionSpec} from "@/state/connections-database/configs";
import {createJSONStorage, persist} from "zustand/middleware";
import {useRelationsHydrationState} from "@/state/relations.state";


export interface DatabaseConnectionZustand {
    history: DBConnectionSpec[];
    connectionsConfigOpen: boolean;
    connectionsConfigForcedOpen: boolean;
    setConnectionsConfigOpen: (open: boolean) => void;
    setConnectionsConfigForcedOpen: (open: boolean) => void;
    setDatabaseConnection: (connection: DatabaseConnection) => Promise<void>;
}


interface DBConHydrationState {
    hydrated: boolean;
    setHydrated: (hydrated: boolean) => void;
}

export const useDBConHydrationState = createWithEqualityFn<DBConHydrationState>(
    (set, get) => ({
        hydrated: false,
        setHydrated: (hydrated: boolean) => set({hydrated}),
    }),
);

const storage = createJSONStorage(() => localStorage, {
    reviver: (key, value) => {
        // always retrieve the value connectionsConfigOpen as false
        if (key === 'connectionsConfigOpen') {
            return false;
        }

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
            connectionsConfigOpen: false,
            connectionsConfigForcedOpen: false,
            setConnectionsConfigOpen: (open) => {
                set({connectionsConfigOpen: open});
            },
            setConnectionsConfigForcedOpen: (open) => {
                set({connectionsConfigForcedOpen: open, connectionsConfigOpen: open});
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

                // add sources
                const sourceState = useSourceConState.getState();
                // add the duckdb internal databases as data sources
                const duckdbInternalDatabases = await getDuckDBInternalDatabase(connection);
                await sourceState.addSourceConnection(duckdbInternalDatabases, true, true);

                if (connection.type in ['duckdb-over-http']) {
                    // add the local file system over duckdb connection
                    const fileSystemOverDuckdb = await getDuckDBLocalFilesystem();
                    await sourceState.addSourceConnection(fileSystemOverDuckdb, true, true);
                }

            },
        }),
        {
            onRehydrateStorage: (state) => {
                useDBConHydrationState.getState().setHydrated(true);
            },
            name: "database-connection",
            storage: storage,
        }
    )
);




