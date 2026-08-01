'use client';

import React from "react";
import {ChevronRight, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {FilterTag, FilterTags} from "@/components/basics/filter-tags";
import {SearchBox} from "@/components/basics/search-box";
import {CatalogObject, ColumnRow, Scope} from "@/components/catalog/catalog-model";
import {CatalogTag} from "@/components/catalog/utils/catalog-tags";

/**
 * What the facet chips count: the path+search-filtered rows of the active scope, plus the facets
 * lifted to that row type. Both scopes are carried so the chip counts always match the grid.
 */
export interface CatalogFacets {
    scope: Scope;
    objects: CatalogObject[];
    objectTags: CatalogTag[];
    columns: ColumnRow[];
    columnTags: FilterTag<ColumnRow>[];
}

export interface CatalogToolbarProps {
    facets: CatalogFacets;
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
    const {facets} = props;
    const chipProps = {className: "min-w-0", activeKey: props.activeTag, onChange: props.setActiveTag};
    return (
        <>
            <div className="flex items-center justify-between gap-4 pb-2">
                {facets.scope === 'tables'
                    ? <FilterTags {...chipProps} tags={facets.objectTags} items={facets.objects}/>
                    : <FilterTags {...chipProps} tags={facets.columnTags} items={facets.columns}/>}
                <SearchBox open={props.searchOpen} setOpen={props.setSearchOpen} value={props.search} onChange={props.setSearch}/>
            </div>

            {props.pathFilter.length > 0 && <PathBar path={props.pathFilter} onClear={props.onClearPath}/>}
        </>
    );
}

function PathBar({path, onClear}: { path: string[]; onClear: () => void }) {
    return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground pb-2 pl-2">
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
