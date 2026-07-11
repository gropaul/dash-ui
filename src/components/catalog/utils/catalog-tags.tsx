'use client';

import React from "react";
import {Braces, Hash, Shapes, Text} from "lucide-react";
import {FilterTag} from "@/components/basics/filter-tags";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {Column} from "@/model/data-source-connection";
import {ValueTypeGroup} from "@/model/value-type";
import {CatalogObject, columnGroup, Scope} from "@/components/catalog/catalog-model";

/**
 * A catalog facet chip. Extends the generic object-level {@link FilterTag} with an optional
 * column-level predicate: source and object-type facets match whole objects, while column-type
 * facets additionally narrow which columns show in the columns scope. All facets funnel through
 * a single active-key + predicate, so the view filters generically instead of per-facet.
 */
export interface CatalogTag extends FilterTag<CatalogObject> {
    /** Column-level match for the columns scope. Omitted for object-only facets, where every
     *  column of a matching object passes. */
    columnPredicate?: (col: Column) => boolean;
}

// Coarse column-type groups shown as chips (see getValueTypeGroup); 'date' is intentionally omitted.
const TYPE_GROUPS: { key: ValueTypeGroup; label: string; icon: React.ReactNode }[] = [
    {key: 'numeric', label: 'numeric', icon: <Hash size={12}/>},
    {key: 'string', label: 'string', icon: <Text size={12}/>},
    {key: 'nested', label: 'nested', icon: <Braces size={12}/>},
    {key: 'other', label: 'other', icon: <Shapes size={12}/>},
];

const OBJ_TYPE_TAGS: CatalogTag[] = [
    {key: 'obj:relation', label: 'Tables', icon: defaultIconFactory('relation'), predicate: (o) => o.objType === 'relation'},
    {key: 'obj:view', label: 'Views', icon: defaultIconFactory('view'), predicate: (o) => o.objType === 'view'},
];

const TYPE_TAGS: CatalogTag[] = TYPE_GROUPS.map((g) => ({
    key: `type:${g.key}`,
    label: g.label,
    icon: g.icon,
    predicate: (o) => o.columns.some((c) => columnGroup(c) === g.key),
    columnPredicate: (c) => columnGroup(c) === g.key,
}));

/** The facet chips for the current scope: source (only when >1) + object-type (tables only) + column-type. */
export function buildCatalogTags(scope: Scope, sourceNames: string[]): CatalogTag[] {
    const sourceTags: CatalogTag[] = sourceNames.length > 1
        ? sourceNames.map((name) => ({
            key: `source:${name}`,
            label: name,
            icon: defaultIconFactory('database'),
            predicate: (o) => o.connectionName === name,
        }))
        : [];
    const objTypeTags = scope === 'tables' ? OBJ_TYPE_TAGS : [];
    return [...sourceTags, ...objTypeTags, ...TYPE_TAGS];
}

/** Whether an object passes the active tag — no active tag means everything passes. */
export function objectMatchesTag(o: CatalogObject, tag?: CatalogTag): boolean {
    return !tag || tag.predicate(o);
}

/** Whether a column passes the active tag; object-only facets match every column of a matching object. */
export function columnMatchesTag(col: Column, tag?: CatalogTag): boolean {
    return !tag || !tag.columnPredicate || tag.columnPredicate(col);
}
