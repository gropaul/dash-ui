import {ValueType} from "@/model/value-type";
import {Calendar, CircleHelp, Hash, Text, ToggleLeft} from "lucide-react";
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
        default:
            console.warn(`Unknown column type: ${type}`);
            return <CircleHelp size={iconSize}/>;
    }
}
