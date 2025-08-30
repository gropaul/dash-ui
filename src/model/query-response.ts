export interface QueryResponse {
    columns: { name: string, type: string }[]
    rows: any[][]
    stats: { rows: number }
}