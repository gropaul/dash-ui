"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {Search} from "lucide-react";

export type Suggestion = string | { id: string | number; label: string };

interface SearchAutocompleteProps {
    suggestions?: Suggestion[];
    suggestionLimit?: number;
    value?: string;
    onSearchTermChange?: (term: string) => Promise<Suggestion[] | void> | Suggestion[] | void;
    onSelect?: (suggestion: Suggestion) => void;
    placeholder?: string;
    loading?: boolean;
    className?: string;
    minChars?: number;
    debounceMs?: number;
    renderItem?: (args: { suggestion: Suggestion; term: string; isActive: boolean }) => React.ReactNode;
}

export default function SearchAutocomplete({
                                               suggestions = ["Tailwind CSS", "React", "Next.js", "Vercel", "shadcn/ui", "Headless UI", "Radix UI"],
                                               suggestionLimit,
                                               value,
                                               onSearchTermChange,
                                               onSelect,
                                               placeholder = "Search...",
                                               loading = false,
                                               className,
                                               minChars = 0,
                                               debounceMs = 120,
                                               renderItem,
                                           }: SearchAutocompleteProps) {
    const isControlled = typeof value === "string";
    const [internalValue, setInternalValue] = useState<string>(value ?? "");
    const inputValue = isControlled ? (value as string) : internalValue;

    const [derivedSuggestions, setDerivedSuggestions] = useState<Suggestion[]>(suggestions);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useRef<string>(`listbox-${Math.random().toString(36).slice(2)}`).current;

    useEffect(() => {
        setDerivedSuggestions(suggestions);
    }, [suggestions]);

    const debounceTimer = useRef<number | undefined>(undefined);
    const handleInputChange = useCallback(
        (term: string) => {
            const perform = () => {
                if (onSearchTermChange) {
                    const maybe = onSearchTermChange(term);
                    if (maybe instanceof Promise) {
                        maybe.then((res) => {
                            if (Array.isArray(res)) setDerivedSuggestions(res);
                        });
                    } else if (Array.isArray(maybe)) {
                        setDerivedSuggestions(maybe);
                    } else {
                        setDerivedSuggestions(filterSuggestions(suggestions, term));
                    }
                } else {
                    setDerivedSuggestions(filterSuggestions(suggestions, term));
                }
                setOpen(term.length >= minChars);
                setActiveIndex(-1);
            };

            window.clearTimeout(debounceTimer.current);
            debounceTimer.current = window.setTimeout(perform, debounceMs);
        },
        [onSearchTermChange, suggestions, minChars, debounceMs]
    );

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setActiveIndex(-1);
            }
        }

        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    useEffect(() => {
        if (isControlled) setInternalValue(value as string);
    }, [isControlled, value]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        if (!isControlled) setInternalValue(term);
        handleInputChange(term);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, derivedSuggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < derivedSuggestions.length) {
                e.preventDefault();
                choose(derivedSuggestions[activeIndex]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
        }
    };

    const handleBlur = () => {
        setTimeout(() => setOpen(false), 100);
    };

    const choose = (s: Suggestion) => {
        const text = typeof s === "string" ? s : s.label;
        if (!isControlled) setInternalValue(text);
        setOpen(false);
        setActiveIndex(-1);
        onSelect?.(s);
    };

    const rendered = useMemo(
        () => derivedSuggestions.slice(0, suggestionLimit || derivedSuggestions.length),
        [derivedSuggestions]
    );
    const showPanel = open && inputValue.length >= minChars && rendered.length > 0;

    return (
        <div ref={containerRef} className={cn(className)}>
            <div
                role="combobox"
                aria-expanded={showPanel}
                aria-controls={listboxId}
                className="relative flex-1 min-w-0"
            >
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleSearchChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full pr-9"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    {loading ? <>Loading ...</> : <Search className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* If you render a dropdown/panel, anchor it here */}
                {/* <div id={listboxId} className="absolute z-50 mt-1 w-full ...">...</div> */}
            </div>


            {showPanel && (
                <div
                    className="absolute top-full z-50 rounded-md border bg-background w-auto inline-block"
                    role="presentation"
                >
                    <ul
                        id={listboxId}
                        role="listbox"
                        className="max-h-48 overflow-auto py-1 rounded-sm border-s bg-background shadow-md text-sm whitespace-nowrap"
                    >
                        {rendered.map((s, idx) => {
                            const key = typeof s === "string" ? s : s.id;
                            const label = typeof s === "string" ? s : s.label;
                            const isActive = idx === activeIndex;

                            return (
                                <li
                                    id={`${listboxId}-option-${idx}`}
                                    key={key}
                                    role="option"
                                    aria-selected={isActive}
                                    className={cn(
                                        "cursor-pointer py-1.5 px-2 hover:bg-muted min-w-48",
                                        isActive && "bg-muted"
                                    )}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(s)}
                                >
                                    {renderItem
                                        ? renderItem({ suggestion: s, term: inputValue, isActive })
                                        : <Highlighted text={label} term={inputValue} />}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function filterSuggestions(source: Suggestion[], term: string): Suggestion[] {
    if (!term) return source;
    const lower = term.toLowerCase();
    return source.filter((s) => (typeof s === "string" ? s.toLowerCase() : s.label.toLowerCase()).includes(lower));
}

function Highlighted({text, term}: { text: string; term: string }) {
    if (!term) return <span>{text}</span>;
    const i = text.toLowerCase().indexOf(term.toLowerCase());
    if (i === -1) return <span>{text}</span>;
    const before = text.slice(0, i);
    const match = text.slice(i, i + term.length);
    const after = text.slice(i + term.length);
    return (
        <span>
      {before}
            <mark className="rounded">{match}</mark>
            {after}
    </span>
    );
}
