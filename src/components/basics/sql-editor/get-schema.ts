// Define interfaces for the database structure
export interface Column {
    name: string;
    type: string;
}

export interface Table {
    name: string;
    type: string;
    children: Column[];
}

export interface Database {
    name: string;
    type: string;
    children: Table[];
}

export async function getDatabaseFunctions(): Promise<string[]> {
    return ['function1', 'function2'];
}

export async function getDatabaseKeywords(): Promise<string[]> {
    return ['keyword1', 'keyword2'];
    // FROM duckdb_keywords();, see https://duckdb.org/docs/sql/meta/duckdb_table_functions.html#duckdb_keywords
}

export async function getDatabaseStructure(): Promise<Database[]> {
    return [
        {
            name: 'default',
            type: 'ordinary',
            children: [
                {
                    name: 'table1',
                    type: 'ordinary',
                    children: [
                        {
                            name: 'table1_column1',
                            type: 'Int32'
                        },
                        {
                            name: 'table1_column2',
                            type: 'String'
                        }
                    ]
                },
                {
                    name: 'table2',
                    type: 'ordinary',
                    children: [
                        {
                            name: 'table2_column1',
                            type: 'Int32'
                        },
                        {
                            name: 'table2_column2',
                            type: 'String'
                        }
                    ]
                }
            ]
        }
    ]
}