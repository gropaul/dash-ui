import {createJSONStorage, PersistStorage} from "zustand/middleware";
import {duckdbTableStorageProvider} from "@/state/persistency/duckdb-storage";
import {duckdbLocalStorageProvider} from "@/state/persistency/local-json";
import {RelationZustandCombined, useRelationsHydrationState, useRelationsState} from "@/state/relations.state";
import {DatabaseConnection} from "@/model/database-connection";

export function InitializeStorage(): PersistStorage<RelationZustandCombined> | undefined {
    return localStorage;
}

// This will be called from the Init State as soon as there is a (new) working database connection.
// Relation state is persisted INTO the connection's dash database (the per-project dash file) for
// every DuckDB backend, so project isolation comes from the file itself — no per-project browser key.
export function loadRelationStateFromConnections(con: DatabaseConnection) {
    if (con.type === 'duckdb-over-http' || con.type === 'duckdb-wasm' || con.type === 'duckdb-wasm-motherduck') {
        useRelationsState.persist.setOptions({
            storage: duckdbStorage,
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
