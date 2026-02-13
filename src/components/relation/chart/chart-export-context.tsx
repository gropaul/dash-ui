import {createContext, MutableRefObject, ReactNode, useContext, useState} from 'react';
import {ExportableRef} from "@/components/relation/chart/exportable";

interface ChartExportContextValue {
    exportableRef: MutableRefObject<ExportableRef | null> | null;
    setExportableRef: (ref: MutableRefObject<ExportableRef | null> | null) => void;
}

const ChartExportContext = createContext<ChartExportContextValue | null>(null);

export function ChartExportProvider({children}: { children: ReactNode }) {
    const [exportableRef, setExportableRef] = useState<MutableRefObject<ExportableRef | null> | null>(null);

    return (
        <ChartExportContext.Provider value={{exportableRef, setExportableRef}}>
            {children}
        </ChartExportContext.Provider>
    );
}

export function useChartExport() {
    return useContext(ChartExportContext);
}