import {createContext} from "react";
import {RelationData} from "@/model/relation";

interface DuckDBProxy {
    name: string;
    executeQuery: (query: string) => Promise<RelationData>;
}


export const DuckDBProvider = createContext({} as DuckDBProxy);


