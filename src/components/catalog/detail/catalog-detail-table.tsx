'use client';

import React, {useState} from "react";
import {toast} from "sonner";
import {Braces, Check, Copy, Hash, Shapes, Text} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {ColumnConfigList, ColumnFilterTag} from "@/components/relation/common/column-config-list";
import {ValueIcon} from "@/components/relation/common/value-icon";
import {getValueTypeGroup} from "@/model/value-type";
import {DetailMode, DetailShell} from "@/components/catalog/detail/catalog-detail-shell";
import {CatalogRelationPreview} from "@/components/catalog/utils/catalog-relation-preview";
import {
    CatalogObject,
    CatalogSelection,
    formatEstimatedRows,
    objectPath,
    sqlForObject,
} from "@/components/catalog/catalog-model";

// Column-type filter chips, matching the grid toolbar (temporal intentionally omitted).
const COLUMN_FILTERS: ColumnFilterTag[] = [
    {key: 'numeric', label: 'Numeric', icon: <Hash size={12}/>, predicate: (c) => getValueTypeGroup(c.type) === 'numeric'},
    {key: 'string', label: 'String', icon: <Text size={12}/>, predicate: (c) => getValueTypeGroup(c.type) === 'string'},
    {key: 'nested', label: 'Nested', icon: <Braces size={12}/>, predicate: (c) => getValueTypeGroup(c.type) === 'nested'},
    {key: 'other', label: 'Other', icon: <Shapes size={12}/>, predicate: (c) => getValueTypeGroup(c.type) === 'other'},
];

/** Detail view for a table/view: overview stats, its columns, and the SQL it maps to. */
export function CatalogDetailTable({object, mode, onToggleExpand, onClose, onSelect}: {
    object: CatalogObject;
    mode: DetailMode;
    onToggleExpand: () => void;
    onClose: () => void;
    onSelect: (sel: CatalogSelection) => void;
}) {
    return (
        <DetailShell
            object={object}
            mode={mode}
            iconType={object.objType}
            title={object.name}
            typeLabel={object.objType === 'view' ? 'view' : 'table'}
            onToggleExpand={onToggleExpand}
            onClose={onClose}
        >
            <Tabs defaultValue="overview" className="h-full min-h-0 flex flex-col">
                <TabsList className="self-start">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="columns">Columns</TabsTrigger>
                    <TabsTrigger value="sql">SQL</TabsTrigger>
                </TabsList>
                <div className="flex-1 min-h-0 overflow-auto pt-3">
                    <TabsContent value="overview" className="mt-0 data-[state=active]:flex h-full flex-col min-h-0 gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Stat label="Database" value={object.database}/>
                            <Stat label="Schema" value={object.schema}/>
                            <Stat label="Type" value={object.objType === 'view' ? 'View' : 'Table'}/>
                            <Stat label="Columns" value={object.columns.length}/>
                            <Stat label="Rows (est.)" value={formatEstimatedRows(object.estimatedRows)}/>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <CatalogRelationPreview object={object} mode={mode}/>
                        </div>
                    </TabsContent>
                    <TabsContent value="columns" className="mt-0">
                        <ColumnConfigList
                            columns={object.columns}
                            filterTags={COLUMN_FILTERS}
                            renderIcon={(c) => <span className="shrink-0 text-muted-foreground"><ValueIcon type={c.type} size={14}/></span>}
                            renderStatus={(c) => <span className="shrink-0 text-xs text-muted-foreground">{c.type}</span>}
                            onRowClick={(c) => onSelect({objId: object.id, colName: c.name})}
                        />
                    </TabsContent>
                    <TabsContent value="sql" className="mt-0">
                        <SqlBlock sql={sqlForObject(object)}/>
                    </TabsContent>
                </div>
            </Tabs>
        </DetailShell>
    );
}

export function Stat({label, value}: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
        </div>
    );
}

function SqlBlock({sql}: { sql: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        try {
            navigator.clipboard?.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch {
            toast.error("Could not copy to clipboard");
        }
    };
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Query this table</span>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={copy}>
                    {copied ? <><Check size={12}/> copied</> : <><Copy size={12}/> copy</>}
                </Button>
            </div>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto whitespace-pre-wrap font-mono">{sql}</pre>
        </div>
    );
}
