import {create} from "zustand";
import {Monaco} from "@monaco-editor/react";
import {refreshMonacoTokenizer} from "@/components/basics/sql-editor/register-autocomplete";
import {ConnectionsService} from "@/state/connections/connections-service";

interface MonacoZustand {
    monaco: Monaco | null;
    setMonaco: (monaco: Monaco) => void;
    refresh: () => void;
}

ConnectionsService.getInstance().onDatabaseConnectionChange((connection) => {
    if (connection) {
        useMonacoState.getState().refresh();
    }
});

export const useMonacoState = create<MonacoZustand>()((set, get) => ({
    monaco: null,
    setMonaco: (monaco: Monaco) => set({monaco}),
    refresh: () => {
        const {monaco} = get();
        if (monaco) {
            refreshMonacoTokenizer(monaco);
        }
    },
}));
