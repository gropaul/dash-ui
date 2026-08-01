"use client"

import React from "react";
import {RelationViewType} from "@/model/relation-view-state";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ViewModePicker} from "@/components/relation/settings/view-mode-picker";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {RelationConfigTabProps} from "@/components/relation/config/relation-config-tab";
import {useRelationData} from "@/state/relations-data.state";
import {GetEmptyRelationData} from "@/model/relation";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";
import {Separator} from "@/components/ui/separator";

/** True if the selected view type contributes its own settings component. */
export function hasViewSettings(viewType: RelationViewType): boolean {
    return ViewManager.instance.getSettingsComponent(viewType) !== null;
}

/**
 * Default tab: pick the view type, then configure it. The per-type settings component comes from
 * the view itself (`IRelationView.getSettingsComponent`), so adding a view type needs no change here.
 */
export function ViewSettingsTab(props: RelationConfigTabProps) {
    const actualData = useRelationData(props.relationState);
    const viewType = props.relationState.viewState.selectedView;
    const SettingsComponent = ViewManager.instance.getSettingsComponent(viewType);

    const data = actualData ?? GetEmptyRelationData();
    const contentProps: RelationViewContentProps = {...props, data};

    function onViewChange(newViewType: RelationViewType) {
        props.updateRelationViewState({selectedView: newViewType});
    }

    return (
        <div className="flex flex-col gap-2">
            <Label><Muted>Display as</Muted></Label>
            <ViewModePicker currentView={viewType} onViewChange={onViewChange}/>
            {SettingsComponent && (
                <>
                    <Separator/>
                    <SettingsComponent {...contentProps}/>
                </>
            )}
        </div>
    );
}
