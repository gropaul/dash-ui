import {ValueType} from "@/model/value-type";


export interface Column {
    id: string,
    name: string,
    type: ValueType,
}