import {ValueType} from "@/model/value-type";
import {Braces, Brackets, Calendar, CircleHelp, Hash, Text, ToggleLeft} from "lucide-react";
import React from "react";

export function ValueIcon({type, size}: { type: ValueType, size?: number }) {
    const iconSize = size || 16;
    switch (type) {
        case 'Integer':
            return <Hash size={iconSize}/>;
        case 'Float':
            return <Hash size={iconSize}/>;
        case 'String':
            return <Text size={iconSize}/>;
        case 'Boolean':
            return <ToggleLeft size={iconSize}/>;
        case 'Timestamp':
            return <Calendar size={iconSize}/>;
        case 'List':
            return <Brackets size={iconSize}/>;
        case 'Map':
        case 'Struct':
            return <Braces size={iconSize}/>;
        default:
            console.warn(`Unknown column type: ${type}`);
            return <CircleHelp size={iconSize}/>;
    }
}
