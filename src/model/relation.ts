import {Property} from "csstype";
import {Column} from "@/model/column";

export type Row = any[]

export interface Relation {
    name: string,
    columns: Column[]
    rows: Row[]
}

export function getTestRelation() : Relation {
    return {
        name: 'Test Relation',
        columns: [
            {
                name: 'Column 1',
                type: 'Integer',
            },
            {
                name: 'Column 2',
                type: 'String',
            }
        ],
        rows: [
            [1, "This"],
            [2, "is"],
            [3, "a"],
            [4, "test"],
        ]
    }
}