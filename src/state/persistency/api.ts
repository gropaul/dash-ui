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
    return duckdbLocalStorage;
}

export function SwitchOnNewConnection(con: DatabaseConnection) {
    if (con.type === 'duckdb-over-http') {
        switchToOverHttpStorage();
    } else if (con.type === 'duckdb-wasm') {
        switchToLocalStorage();
    }

}

const switchToOverHttpStorage = () => {
    useRelationsState.persist.setOptions({
        storage: duckdbOverHttpStorage,
    });
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
};

const switchToLocalStorage = () => {
    useRelationsState.persist.setOptions({
        storage: duckdbLocalStorage,
    });
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
};


export const duckdbOverHttpStorage: PersistStorage<RelationZustandCombined> | undefined = createJSONStorage(() => duckdbOverHttpStorageProvider);
export const duckdbLocalStorage: PersistStorage<RelationZustandCombined> | undefined = duckdbLocalStorageProvider;
