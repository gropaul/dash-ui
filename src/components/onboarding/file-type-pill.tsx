import React from "react";
import {cn} from "@/lib/utils";

const COLOR_MAP = {
    blue: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    emerald: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    violet: "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
} as const;

interface FileTypePillProps {
    color: keyof typeof COLOR_MAP;
    children: React.ReactNode;
}

export function FileTypePill({color, children}: FileTypePillProps) {
    return (
        <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-default",
            COLOR_MAP[color]
        )}>
            {children}
        </span>
    );
}
