import {ValueType} from "@/model/value-type";
import {TreeNode} from "@/components/basics/files/tree-utils";


export interface Column extends TreeNode {
    id: string,
    name: string,
    type: ValueType,
}