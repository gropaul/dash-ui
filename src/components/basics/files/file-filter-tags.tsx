'use client';

import React from "react";
import {Folder, FileText, Sheet} from "lucide-react";
import {FilterTag} from "@/components/basics/filter-tags";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {VIEW_MODES} from "@/components/relation/settings/view-mode-picker";
import {CommandFile} from "@/state/gui.state";
import {fileIconType} from "@/components/workspace/file-icon";

const KIND_TAGS: FilterTag<CommandFile>[] = [
    {key: "folder", label: "Folders", icon: <Folder size={12}/>, predicate: (f) => f.kind === "folder"},
    {key: "query", label: "Queries", icon: <Sheet size={12}/>, predicate: (f) => f.kind === "query"},
    {key: "page", label: "Pages", icon: <FileText size={12}/>, predicate: (f) => f.kind === "page"},
];

/**
 * The kind chips plus one chip per view type (Table/Chart/…), read from each query's `-- view:` line.
 * Combine with <FilterTags/>, which hides any chip whose live count is zero.
 */
export const FILE_FILTER_TAGS: FilterTag<CommandFile>[] = [
    ...KIND_TAGS,
    ...VIEW_MODES.map((mode): FilterTag<CommandFile> => ({
        key: `view:${mode.viewType}`,
        label: mode.label,
        icon: <span className="[&_svg]:size-3">{defaultIconFactory(mode.viewType)}</span>,
        predicate: (f) => f.kind === "query" && fileIconType(f) === mode.viewType,
    })),
];
