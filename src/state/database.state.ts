import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import {
    binarySearchByName,
    Column,
    Database,
    DatabaseFunction,
    DatabaseKeyword,
    getDatabaseFunctions,
    getDatabaseKeywords,
    getDatabaseStructure,
    getMacroColumns,
    normalizeIdentifier,
    Table
} from "@/components/basics/sql-editor/get-schema";

// Re-export so existing imports from database.state still work
export {binarySearchByName};
import {getAllRelations} from "@/state/relations/all-relation-utils";
import {getMacroName} from "@/state/relations/sql/table-macros";


interface DatabaseZustand {
    structure: Database[];
    functions: DatabaseFunction[];
    keywords: DatabaseKeyword[];
    refresh: () => Promise<void>;
    /** Find a table by name across all databases using binary search. */
    getTableByName: (name: string) => Table | undefined;
    /** Find a column by name within a list of tables using binary search. */
    getColumnByName: (tables: Table[], columnName: string) => Column | undefined;
}

export const useDatabaseState = create<DatabaseZustand>()(
    persist(
        (set, get) => ({
            structure: [],
            functions: [],
            keywords: [],
            refresh: async () => {
                const [structure, functions, keywords] = await Promise.all([
                    getDatabaseStructure(),
                    getDatabaseFunctions(),
                    getDatabaseKeywords(),
                ]);
                // Merge canvas/dashboard relations as dash_node tables
                const macroTables: Table[] = getAllRelations()
                    .filter(r => r.origin !== 'dashboard' && r.relation.query.baseQuery)
                    .map(r => {
                        const macroName = getMacroName(r.relation.viewState.displayName);
                        return {
                            name: macroName,
                            escapedName: normalizeIdentifier(macroName),
                            type: 'dash_node' as const,
                            displayName: r.relation.viewState.displayName,
                            query: r.relation.query.baseQuery,
                            children: [],
                        };
                    });
                // Populate columns for each macro via DESCRIBE
                const macroColumns = await getMacroColumns(macroTables.map(t => t.name));
                for (const t of macroTables) {
                    t.children = macroColumns.get(t.name) ?? [];
                }

                macroTables.sort((a, b) => a.escapedName.localeCompare(b.escapedName));
                if (macroTables.length > 0) {
                    structure.push({name: 'canvas', escapedName: 'canvas', type: 'dash_node', children: macroTables});
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
