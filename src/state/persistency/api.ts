import {createJSONStorage, PersistStorage} from "zustand/middleware";
import {duckdbOverHttpStorageProvider} from "@/state/persistency/duckdb-over-http";
import {duckdbLocalStorageProvider} from "@/state/persistency/duckdb-local";
import {RelationZustandCombined, useRelationsState} from "@/state/relations.state";
import {DatabaseConnection} from "@/model/database-connection";
import {ConnectionsService} from "@/state/connections-service";

export function InitializeStorage() : PersistStorage<RelationZustandCombined> | undefined{
    ConnectionsService.getInstance().onDatabaseConnectionChange((con) => {
        if (con) {
            SwitchOnNewConnection(con);
        }
    });
    return localStorage;
}

export function SwitchOnNewConnection(con: DatabaseConnection) {
    if (con.type === 'duckdb-over-http' || con.type === 'duckdb-wasm') {
        switchToDuckDBStorage();
    }
    throw new Error('Connection type not supported');

}

const switchToDuckDBStorage = () => {
    useRelationsState.persist.setOptions({
        storage: duckdbStorage,
    });
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
};

const switchToLocalStorage = () => {
    useRelationsState.persist.setOptions({
        storage: localStorage,
    });
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
};


export const duckdbStorage: PersistStorage<RelationZustandCombined> | undefined = createJSONStorage(() => duckdbOverHttpStorageProvider);
export const localStorage: PersistStorage<RelationZustandCombined> | undefined = duckdbLocalStorageProvider;
