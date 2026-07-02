"use client"

import React from 'react';
import {RelationViewProps} from "@/components/relation/relation-view";
import {useRelationData} from "@/state/relations-data.state";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {RelationViewType} from "@/model/relation-view-state";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ViewModePicker, VIEW_MODES} from "@/components/relation/settings/view-mode-picker";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {ScrollArea} from "@/components/ui/scroll-area";

export function hasSettingsPanel(viewType: RelationViewType): boolean {
    return ViewManager.instance.getSettingsComponent(viewType) !== null;
}

export function ViewSettingsPanel(props: RelationViewProps) {
    const data = useRelationData(props.relationState);
    const viewType = props.relationState.viewState.selectedView;
    const SettingsComponent = ViewManager.instance.getSettingsComponent(viewType);

    if (!SettingsComponent || !data) return null;

    const contentProps: RelationViewContentProps = {...props, data};
    const advancedActions = getRelationActions(props);
    const mode = VIEW_MODES.find(m => m.viewType === viewType);

    function onViewChange(newViewType: RelationViewType) {
        advancedActions.updateRelationViewState({selectedView: newViewType});
    }

    return (
        <div className="h-full min-h-0">
            <ScrollArea className="h-full w-full pr-3">
                <div className="flex flex-col gap-2 p-0.5">
                    <Label><Muted>Display as</Muted></Label>
                    <ViewModePicker currentView={viewType} onViewChange={onViewChange}/>
                    {mode && (
                        <div className="border-t pt-2">
                            <span className="text-sm font-medium">{mode.label} Config</span>
                        </div>
                    )}
                    <SettingsComponent {...contentProps}/>
                </div>
            </ScrollArea>
        </div>
    );
}
