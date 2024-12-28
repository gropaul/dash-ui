import React from "react";
import {cn} from "@/lib/utils";

interface MyDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
    className?: string;
}

export function MyDialog({open, onOpenChange, children, className}: MyDialogProps) {
    if (!open) return null;

    return (<div className="z-50 fixed inset-0 flex items-center justify-center bg-black bg-opacity-75"
                 onClick={() => onOpenChange?.(false)}>
            <div
                className={cn("bg-background p-6 rounded-lg shadow-lg max-w-lg w-full border-[1px] border-muted", className)}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}