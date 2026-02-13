import {createContext, MutableRefObject, ReactNode, useContext, useState} from 'react';
import {ExportableRef} from "@/components/relation/chart/exportable";

interface RelationContextContent {
    exportableChartRef: MutableRefObject<ExportableRef | null> | null;
    setExportableChartRef: (ref: MutableRefObject<ExportableRef | null> | null) => void;
}

const RelationContext = createContext<RelationContextContent | null>(null);

export function RelationContextProvider({children}: { children: ReactNode }) {
    const [exportableChartRef, setExportableChartRef] = useState<MutableRefObject<ExportableRef | null> | null>(null);

    return (
        <RelationContext.Provider value={{exportableChartRef, setExportableChartRef}}>
            {children}
        </RelationContext.Provider>
    );
}

export function useRelationContext() {
    return useContext(RelationContext);
}