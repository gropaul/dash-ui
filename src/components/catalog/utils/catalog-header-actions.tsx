'use client';

import React from "react";
import {Columns3, RefreshCw, Table2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Scope} from "@/components/catalog/catalog-model";

/** The catalog header controls: the Tables/Columns scope toggle and the refresh-all button. */
export function CatalogHeaderActions({scope, onScopeChange, onRefreshAll, refreshing}: {
    scope: Scope;
    onScopeChange: (scope: Scope) => void;
    onRefreshAll: () => void;
    refreshing: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <ScopeToggle scope={scope} onScopeChange={onScopeChange}/>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onRefreshAll}
                    disabled={refreshing} aria-label="Refresh all connections">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined}/> Refresh
            </Button>
        </div>
    );
}

/** Segmented Tables/Columns switch; the selected segment is high-contrast (primary). */
function ScopeToggle({scope, onScopeChange}: { scope: Scope; onScopeChange: (scope: Scope) => void }) {
    return (
        <div className="bg-card border rounded-lg text-xs text-muted-foreground">
            <ToggleGroup className="gap-0" type="single" variant="default" value={scope}
                         onValueChange={(v) => v && onScopeChange(v as Scope)} size="sm">
                <ToggleGroupItem
                    value="tables" aria-label="Tables"
                    style={{borderRadius: 0, borderBottomLeftRadius: '0.5rem', borderTopLeftRadius: '0.5rem'}}
                    className="border-r h-8 gap-1 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Table2 size={13}/> Tables
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="columns" aria-label="Columns"
                    style={{borderRadius: 0, borderBottomRightRadius: '0.5rem', borderTopRightRadius: '0.5rem'}}
                    className="rounded rounded-r-lg h-8 gap-1 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                    <Columns3 size={13}/> Columns
                </ToggleGroupItem>
            </ToggleGroup>
        </div>
    );
}
