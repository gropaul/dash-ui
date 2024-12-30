export interface QueryResponse {
    meta: { name: string, type: string }[]
    data: any[][]
    stats: { rows: number }
}