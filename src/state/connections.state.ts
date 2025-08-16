import {DatabaseConnection} from "@/model/database-connection";
import {ConnectionsService} from "@/state/connections/connections-service";
import {createWithEqualityFn} from "zustand/traditional";
import {useDataSourcesState} from "@/state/data-sources.state";
import {getDuckDBInternalDatabase} from "@/state/data-source/duckdb-internal-databases";
import {getDuckDBLocalFilesystem} from "@/state/data-source/duckdb-local-filesystem";
import {DBConnectionSpec} from "@/state/connections/configs";
import {createJSONStorage, persist} from "zustand/middleware";
import {useInitState} from "@/state/init.state";

export interface DatabaseConnectionZustandActions {
    connectionsConfigOpen: boolean;
    connectionsConfigForcedOpen: boolean;
    setConnectionsConfigOpen: (open: boolean) => void;
    setConnectionsConfigForcedOpen: (open: boolean) => void;
    setDatabaseConnection: (connection: DatabaseConnection) => Promise<void>;
    deleteConnectionFromHistory: (index: number) => void;
}

export interface DatabaseConnectionZustandState {
    history: DBConnectionSpec[];
}

export type DatabaseConnectionZustand = DatabaseConnectionZustandState & DatabaseConnectionZustandActions;

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
                const sourceState = useDataSourcesState.getState();
                // add the duckdb internal databases as data sources
                const duckdbInternalDatabases = await getDuckDBInternalDatabase(connection);
                await sourceState.addSourceConnection(duckdbInternalDatabases, true, true);

                if (connection.type in ['duckdb-over-http']) {
                    // add the local file system over duckdb connection
                    const fileSystemOverDuckdb = await getDuckDBLocalFilesystem();
                    await sourceState.addSourceConnection(fileSystemOverDuckdb, true, true);
                }

            },
            deleteConnectionFromHistory: (index) => {
                const history_copy = [...get().history];
                if (index >= 0 && index < history_copy.length) {
                    history_copy.splice(index, 1);
                    set({history: history_copy});
                }
            },
        }),
        {
            onRehydrateStorage: (_unhydrated_state) => {

                // callback that is called when the state is rehydrated
                return (hydrated_state, error) => {
                    if (error || !hydrated_state) {
                        console.log('an error happened during hydration', error)
                    } else {
                        useInitState.getState().onConnectionConfigLoaded(hydrated_state);
                    }
                }
            },
            name: "database-connection",
            storage: storage,
        }
    )
);
