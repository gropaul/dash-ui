"use client"

import React from "react";
import {cn} from "@/lib/utils";
import {RelationViewType} from "@/model/relation-view-state";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";

/**
 * The view-mode registry: one entry per relation view type. The picker grid
 * and the config title in the settings shell are generated from this.
 */
export interface ViewMode {
    viewType: RelationViewType;
    label: string;
    // false -> tile shows a "soon" tag and is not selectable
    ready: boolean;
}

export const VIEW_MODES: ViewMode[] = [
    {viewType: 'table', label: 'Table', ready: true},
    {viewType: 'chart', label: 'Chart', ready: true},
    {viewType: 'text', label: 'Text', ready: true},
    {viewType: 'select', label: 'Select', ready: true},
    {viewType: 'slider', label: 'Slider', ready: true},
    {viewType: 'map', label: 'Map', ready: false},
];

interface ViewModePickerProps {
    currentView: RelationViewType;
    onViewChange: (viewType: RelationViewType) => void;
}

/** Grid of view tiles ("Display as"). Reflows automatically as modes are added. */
export function ViewModePicker({currentView, onViewChange}: ViewModePickerProps) {
    return (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(48px,1fr))] gap-2">
            {VIEW_MODES.map(mode => {
                const active = currentView === mode.viewType;
                return (
                    <button
                        key={mode.viewType}
                        disabled={!mode.ready}
                        onClick={() => onViewChange(mode.viewType)}
                        className={cn(
                            "relative border flex flex-col items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-center transition-colors",
                            active
                                ? "bg-accent text-accent-foreground"
                                : "bg-card text-muted-foreground hover:bg-muted",
                            !mode.ready && "cursor-default opacity-60 hover:bg-card",
                        )}
                    >
                        {!mode.ready && (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5 text-[9px] text-muted-foreground">
                                soon
                            </span>
                        )}
                        {defaultIconFactory(mode.viewType)}
                        <span className="text-xs">{mode.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
