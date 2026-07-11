'use client';

import React from "react";
import {Braces} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {Column} from "@/model/data-source-connection";
import {DetailMode, DetailShell} from "@/components/catalog/detail/catalog-detail-shell";
import {
    CatalogObject,
    CatalogSelection,
    objectPath,
    useCatalogObjects,
} from "@/components/catalog/catalog-model";

/** Detail view for a single column: where it lives, and which other objects carry a
 *  column of the same name (a structural join-key hint), flagging type mismatches. */
export function CatalogDetailColumn({object, column, mode, onToggleExpand, onClose, onSelect}: {
    object: CatalogObject;
    column: Column;
    mode: DetailMode;
    onToggleExpand: () => void;
    onClose: () => void;
    onSelect: (sel: CatalogSelection) => void;
}) {
    const objects = useCatalogObjects();
    const elsewhere = objects
        .filter((x) => x.id !== object.id)
        .map((x) => ({x, col: x.columns.find((c) => c.name === column.name)}))
        .filter((e): e is { x: CatalogObject; col: Column } => !!e.col);

    return (
        <DetailShell
            object={object}
            mode={mode}
            iconType={column.type}
            title={column.name}
            typeLabel={column.type}
            crumbs={[
                {icon: defaultIconFactory(object.objType), label: object.name, onClick: () => onSelect({objId: object.id})},
                {icon: defaultIconFactory(column.type), label: column.name},
            ]}
            onToggleExpand={onToggleExpand}
            onClose={onClose}
        >
            <ScrollArea className="h-full">
                <div className="pb-4">
                    <SectionLabel>
                        Also appears in {elsewhere.length > 0 && <span className="text-foreground">{elsewhere.length}</span>}
                    </SectionLabel>
                    {elsewhere.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No other object has a column named <b>{column.name}</b>.</div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {elsewhere.map(({x, col}) => {
                                const mismatch = col.type !== column.type;
                                return (
                                    <button
                                        key={x.id}
                                        type="button"
                                        onClick={() => onSelect({objId: x.id, colName: col.name})}
                                        className="flex items-center gap-2 py-1.5 px-1 text-left text-sm hover:bg-muted/60 rounded"
                                    >
                                        {defaultIconFactory(x.objType)}
                                        <span className="text-muted-foreground truncate">{objectPath(x).join(" / ")}</span>
                                        <span className={mismatch ? "text-destructive shrink-0" : "text-muted-foreground shrink-0"}>{col.type}</span>
                                        {mismatch && <Braces size={11} className="text-destructive shrink-0"/>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </DetailShell>
    );
}

function SectionLabel({children}: { children: React.ReactNode }) {
    return <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">{children}</div>;
}
