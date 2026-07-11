'use client';

import {useEffect, useRef} from "react";
import {Search, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

export interface SearchBoxProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /**
     * Capture Cmd+F (mac) / Ctrl+F (win/linux) to open and focus the box instead of the
     * browser's native find. Default true — set false where a page hosts multiple search
     * boxes and only one should own the shortcut.
     */
    registerHotkey?: boolean;
    /** Extra classes for the input (e.g. its width when open). */
    inputClassName?: string;
}

/**
 * A collapsible search box: an icon button that expands into an input. When open, Escape
 * clears and closes it. By default it also owns the Cmd/Ctrl+F shortcut (see registerHotkey).
 */
export function SearchBox({
    open, setOpen, value, onChange,
    placeholder = "Search…", registerHotkey = true, inputClassName = "w-44",
}: SearchBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!registerHotkey) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
                e.preventDefault();
                setOpen(true);
                // autoFocus covers the just-opened case; the ref re-focuses when already open.
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [registerHotkey, setOpen]);

    if (!open) {
        return (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Search" onClick={() => setOpen(true)}>
                <Search size={14}/>
            </Button>
        );
    }
    return (
        <div className="flex h-8 border items-center gap-1.5 rounded-md shrink-0">
            <Search size={14} className="shrink-0 mx-2 text-muted-foreground"/>
            <input
                ref={inputRef}
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { onChange(""); setOpen(false); } }}
                placeholder={placeholder}
                className={cn("h-6 text-xs bg-transparent placeholder:text-muted-foreground focus-visible:outline-none", inputClassName)}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 hover:bg-transparent" aria-label="Close search" onClick={() => { onChange(""); setOpen(false); }}>
                <X size={14}/>
            </Button>
        </div>
    );
}
