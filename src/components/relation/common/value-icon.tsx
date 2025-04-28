import {Braces, Brackets, Calendar, CircleHelp, Hash, Text, ToggleLeft} from "lucide-react";
import React from "react";

// @ts-ignore
import {DataType} from "apache-arrow";
// Adapt this type to match all the strings you expect (from your own system + arrow).
export type ValueType =
    | 'Integer'
    | 'Int'
    | 'Int8'
    | 'Int16'
    | 'Int32'
    | 'Int64'
    | 'UInt8'
    | 'UInt16'
    | 'UInt32'
    | 'UInt64'
    | 'Float'
    | 'Float16'
    | 'Float32'
    | 'Float64'
    | 'String'
    | 'Utf8'
    | 'Boolean'
    | 'Bool'
    | 'Timestamp'
    | 'Date64'
    | 'List'
    | 'FixedSizeList'
    | 'Map'
    | 'Struct'
    | 'RecordBatch'
    | 'Unknown';
// Add

export function normalizeArrowType(type: any): ValueType {

    if (DataType.isDate(type)) {
        return 'Date64';
    }

    // if normalized contains list, set it to 'list'
    if (DataType.isList(type)) {
        return 'List';
    } else if (DataType.isDictionary(type) || DataType.isStruct(type) ) {
        return 'Struct';
    }
    // if normalized contains map, set it to 'map'
    else if (DataType.isMap(type)){
        return 'Map';
    } else {
        return type.toString()
    }
}

export function ValueIcon({ type, size }: { type: ValueType; size?: number }) {
    const iconSize = size || 16;
    const normalized = type.toLowerCase()


    switch (normalized) {
        // Integers
        case 'integer':
        case 'int':
        case 'int8':
        case 'int16':
        case 'int32':
        case 'int64':
        case 'uint8':
        case 'uint16':
        case 'uint32':
        case 'uint64':
            return <Hash size={iconSize} />;

        // Floats
        case 'float':
        case 'float16':
        case 'float32':
        case 'float64':
            return <Hash size={iconSize} />;

        // Text / String
        case 'string':
        case 'utf8':
            return <Text size={iconSize} />;

        // Boolean
        case 'boolean':
        case 'bool':
            return <ToggleLeft size={iconSize} />;

        // Date / Timestamp
        case 'timestamp':
        case 'date64':
            return <Calendar size={iconSize} />;

        // Lists
        case 'list':
        case 'fixedsizelist':
            return <Brackets size={iconSize} />;

        // Structs / Maps
        case 'map':
        case 'struct':
        case 'recordbatch':
            return <Braces size={iconSize} />;

        default:
            console.warn(`Unknown or unhandled column type: "${type}"`);
            return <CircleHelp size={iconSize} />;
    }
}
