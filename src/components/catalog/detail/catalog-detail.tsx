'use client';

import React from "react";
import {Column} from "@/model/data-source-connection";
import {DetailMode} from "@/components/catalog/detail/catalog-detail-shell";
import {CatalogDetailColumn} from "@/components/catalog/detail/catalog-detail-column";
import {CatalogDetailTable} from "@/components/catalog/detail/catalog-detail-table";
import {CatalogObject, CatalogSelection} from "@/components/catalog/catalog-model";

export type {DetailMode};

/**
 * The detail view for a catalog selection — dispatches to {@link CatalogDetailColumn} when a
 * column is selected, otherwise {@link CatalogDetailTable}. Both share the same header framing
 * (see {@link DetailShell}); only the body differs.
 */
export function CatalogDetail({object, column, mode, onToggleExpand, onClose, onSelect}: {
    object: CatalogObject;
    column?: Column | null;
    mode: DetailMode;
    onToggleExpand: () => void;
    onClose: () => void;
    onSelect: (sel: CatalogSelection) => void;
}) {
    return column
        ? <CatalogDetailColumn object={object} column={column} mode={mode}
                               onToggleExpand={onToggleExpand} onClose={onClose} onSelect={onSelect}/>
        : <CatalogDetailTable object={object} mode={mode}
                              onToggleExpand={onToggleExpand} onClose={onClose} onSelect={onSelect}/>;
}
