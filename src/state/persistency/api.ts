import {createJSONStorage, PersistStorage} from "zustand/middleware";
import {duckdbTableStorageProvider} from "@/state/persistency/duckdb-storage";
import {duckdbLocalStorageProvider} from "@/state/persistency/local-json";
import {RelationZustandCombined, useRelationsHydrationState, useRelationsState} from "@/state/relations.state";
import {DatabaseConnection} from "@/model/database-connection";

export function InitializeStorage(): PersistStorage<RelationZustandCombined> | undefined {
    return localStorage;
}

// This will be called from the Init State as soon as there is a (new) working database connection
export function loadRelationStateFromConnections(con: DatabaseConnection) {
    if (con.type === 'duckdb-over-http') {
        useRelationsState.persist.setOptions({
            storage: duckdbStorage,
        });
    } else if (con.type === 'duckdb-wasm') {
        useRelationsState.persist.setOptions({
            storage: localStorage,
        });
    } else {
        throw new Error('Connection type not supported');
    }
    rehydrateWithDuckDBStorage();
}

const rehydrateWithDuckDBStorage = () => {

    useRelationsHydrationState.getState().setHasDuckDBStorage(true);
    useRelationsState.persist.rehydrate(); // Rehydrate the store with the new storage
    console.log('Switched to DuckDB storage');
};


export const duckdbStorage: PersistStorage<RelationZustandCombined> | undefined = createJSONStorage(() => duckdbTableStorageProvider);
export const localStorage: PersistStorage<RelationZustandCombined> | undefined = duckdbLocalStorageProvider;
