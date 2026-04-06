import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {
    binarySearchByName,
    Column,
    Database,
    DatabaseFunction,
    DatabaseKeyword,
    getDatabaseFunctions,
    getDatabaseKeywords, getDatabaseMacros,
    getDatabaseStructure,
    Table
} from "@/components/basics/sql-editor/get-schema";

// Re-export so existing imports from database.state still work
export {binarySearchByName};
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {getMacroName} from "@/state/relations/sql/table-macros";
import {ConnectionsService} from "@/state/connections/connections-service";


interface DatabaseZustand {
    structure: Database[];
    functions: DatabaseFunction[];
    keywords: DatabaseKeyword[];
    refresh: (areas?: RefreshArea[]) => Promise<void>;
    /** Find a table by name across all databases using binary search. */
    getTableByName: (name: string) => Table | undefined;
    /** Find a column by name within a list of tables using binary search. */
    getColumnByName: (tables: Table[], columnName: string) => Column | undefined;
}

ConnectionsService.getInstance().onDatabaseConnectionChange(async (connection) => {
    if (connection) {
        await useDatabaseState.getState().refresh();
    }
});

export type RefreshArea = 'structure' | 'functions' | 'keywords';

export const useDatabaseState = create<DatabaseZustand>()(
    persist(
        (set, get) => ({
            structure: [],
            functions: [],
            keywords: [],
            refresh: async (areas: RefreshArea[] = ['structure', 'functions', 'keywords']) => {
                const [structure, macros, functions, keywords] = await Promise.all([
                    areas.includes('structure') ? getDatabaseStructure() : get().structure,
                    areas.includes('structure') ? getDatabaseMacros() : [] as Table[],
                    areas.includes('functions') ? getDatabaseFunctions() : get().functions,
                    areas.includes('keywords') ? getDatabaseKeywords() : get().keywords,
                ]);

                macros.sort((a, b) => a.escapedName.localeCompare(b.escapedName));
                if (macros.length > 0) {
                    structure.push({name: 'canvas', escapedName: 'canvas', type: 'dash_node', children: macros});
                }
                // Sort all levels by escapedName so binary search works correctly
                structure.sort((a, b) => a.escapedName.localeCompare(b.escapedName));
                for (const db of structure) {
                    db.children.sort((a, b) => a.escapedName.localeCompare(b.escapedName));
                    for (const table of db.children) {
                        table.children.sort((a, b) => a.escapedName.localeCompare(b.escapedName));
                    }
                }
                functions.sort((a, b) => a.name.localeCompare(b.name));
                // keywords already ORDER BY keyword_name from the SQL query
                set({structure, functions, keywords});
            },
            getTableByName: (name: string) => {
                const {structure} = get();
                for (const db of structure) {
                    console.log('searching for', name, 'in', db.name, db.children.map(t => t.name));
                    const idx = binarySearchByName(db.children, name);
                    if (idx !== -1) return db.children[idx];
                }
                return undefined;
            },
            getColumnByName: (tables: Table[], columnName: string) => {
                for (const table of tables) {
                    const idx = binarySearchByName(table.children, columnName);
                    if (idx !== -1) return table.children[idx];
                }
                return undefined;
            },
        }),
        {
            name: 'dash-database-state',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                structure: state.structure,
                functions: state.functions,
                keywords: state.keywords,
            }),
            onRehydrateStorage: () => (state) => {
                // Refresh in background after rehydration to pick up any schema changes
                if (state) void state.refresh();
            },
        },
    ),
);
