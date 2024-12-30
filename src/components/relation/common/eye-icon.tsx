import {Eye, EyeOff} from "lucide-react";
import React from "react";

interface AdaptiveEyeOffProps {
    visible: boolean;
    className?: string;
}

export function AdaptiveEyeOff({visible, className}: AdaptiveEyeOffProps) {
    return visible ? <EyeOff className={className}/> : <Eye className={className}/>;
}
