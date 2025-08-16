import {createJSONStorage, PersistStorage} from "zustand/middleware";
import {duckdbOverHttpStorageProvider} from "@/state/persistency/duckdb-storage";
import {duckdbLocalStorageProvider} from "@/state/persistency/local-json";
import {RelationZustandCombined, useRelationsHydrationState, useRelationsState} from "@/state/relations.state";
import {DatabaseConnection} from "@/model/database-connection";

export function InitializeStorage() : PersistStorage<RelationZustandCombined> | undefined{
    return localStorage;
}

// This will be called from the Init State as soon as there is a (new) working database connection
export function loadRelationStateFromConnections(con: DatabaseConnection) {
    if (con.type === 'duckdb-over-http' || con.type === 'duckdb-wasm') {
        rehydrateWithDuckDBStorage();
    } else {
        throw new Error('Connection type not supported');
    }

}

const rehydrateWithDuckDBStorage = () => {
    useRelationsState.persist.setOptions({
        storage: duckdbStorage,
    });
    useRelationsHydrationState.getState().setHasDuckDBStorage(true);
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
    console.log('Switched to DuckDB storage');
};


export const duckdbStorage: PersistStorage<RelationZustandCombined> | undefined = createJSONStorage(() => duckdbOverHttpStorageProvider);
export const localStorage: PersistStorage<RelationZustandCombined> | undefined = duckdbLocalStorageProvider;
