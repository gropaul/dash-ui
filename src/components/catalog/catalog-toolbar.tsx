'use client';

import React from "react";
import {ChevronRight, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {FilterTags} from "@/components/basics/filter-tags";
import {SearchBox} from "@/components/basics/search-box";
import {CatalogObject} from "@/components/catalog/catalog-model";
import {CatalogTag} from "@/components/catalog/utils/catalog-tags";

export interface CatalogToolbarProps {
    /** The path+search-filtered objects the chip counts read from. */
    items: CatalogObject[];
    /** The facet chips for the current scope (see buildCatalogTags). */
    tags: CatalogTag[];
    /** Key of the active facet chip, or '' when none. */
    activeTag: string;
    setActiveTag: (v: string) => void;
    search: string;
    setSearch: (v: string) => void;
    searchOpen: boolean;
    setSearchOpen: (v: boolean) => void;
    pathFilter: string[];
    onClearPath: () => void;
}

/** The facet chip row, search box, and the active-path bar. */
export function CatalogToolbar(props: CatalogToolbarProps) {
    return (
        <>
            <div className="flex items-center justify-between gap-4 pb-2">
                <FilterTags
                    className="min-w-0"
                    tags={props.tags}
                    items={props.items}
                    activeKey={props.activeTag}
                    onChange={props.setActiveTag}
                />
                <SearchBox open={props.searchOpen} setOpen={props.setSearchOpen} value={props.search} onChange={props.setSearch}/>
            </div>

            {props.pathFilter.length > 0 && <PathBar path={props.pathFilter} onClear={props.onClearPath}/>}
        </>
    );
}

function PathBar({path, onClear}: { path: string[]; onClear: () => void }) {
    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground pb-2">
            <span className="uppercase tracking-wide text-[11px] text-muted-foreground/70 mr-1">Path</span>
            {path.map((seg, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={11} className="text-muted-foreground/50"/>}
                    <span className="text-foreground">{seg}</span>
                </React.Fragment>
            ))}
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={onClear} aria-label="Clear path filter">
                <X size={12}/>
            </Button>
        </div>
    );
}
