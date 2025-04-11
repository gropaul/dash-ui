import {createJSONStorage, PersistStorage} from "zustand/middleware";
import {RelationZustandCombined} from "@/state/relations.state";


export const duckdbLocalStorageProvider:  PersistStorage<RelationZustandCombined> | undefined = createJSONStorage(() => localStorage);
