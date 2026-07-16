'use client';

import React from "react";
import {cn} from "@/lib/utils";

interface CommandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
}

/**
 * A button styled to match the command palette's search field: a rounded-2xl, h-10 muted pill
 * that stays subtle until hovered, when a soft outline + background lift reveal it as clickable.
 * Renders icon + label.
 */
export function CommandButton({icon, children, className, ...props}: CommandButtonProps) {
    return (
        <button
            type="button"
            className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-2xl border border-transparent bg-muted px-4 text-sm font-medium transition-colors hover:border-border hover:bg-background hover:text-foreground",
                className,
            )}
            {...props}
        >
            {icon}
            {children}
        </button>
    );
}
