'use client';

import React, {useMemo} from "react";
import {Folder, LayoutDashboard, Sheet, WorkflowIcon} from "lucide-react";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {FilterTag} from "@/components/basics/filter-tags";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {VIEW_MODES} from "@/components/relation/settings/view-mode-picker";
import {useRelationsState} from "@/state/relations.state";

const ENTITY_TYPE_TAGS: FilterTag<TreeNode>[] = [
    {key: "folder", label: "Folders", icon: <Folder size={12}/>, predicate: (n) => n.type === "folder"},
    {key: "relations", label: "Queries", icon: <Sheet size={12}/>, predicate: (n) => n.type === "relations"},
    {key: "dashboards", label: "Dashboards", icon: <LayoutDashboard size={12}/>, predicate: (n) => n.type === "dashboards"},
    {key: "canvas", label: "Canvases", icon: <WorkflowIcon size={12}/>, predicate: (n) => n.type === "canvas"},
];

/**
 * The full tag set: the kind chips plus one chip per relation view type (Table/Chart/…),
 * resolved from each relation's selectedView. Combine with <FilterTags/>, which hides any
 * chip whose live count is zero.
 */
export function useEntityFilterTags(): FilterTag<TreeNode>[] {
    const relations = useRelationsState((state) => state.relations);
    return useMemo<FilterTag<TreeNode>[]>(() => {
        const viewTags: FilterTag<TreeNode>[] = VIEW_MODES.map((mode) => ({
            key: `view:${mode.viewType}`,
            label: mode.label,
            icon: <span className="[&_svg]:size-3">{defaultIconFactory(mode.viewType)}</span>,
            predicate: (n) => n.type === "relations" && relations[n.id]?.viewState?.selectedView === mode.viewType,
        }));
        return [...ENTITY_TYPE_TAGS, ...viewTags];
    }, [relations]);
}
