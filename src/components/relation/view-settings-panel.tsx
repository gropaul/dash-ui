"use client"

import React from 'react';
import {RelationViewProps} from "@/components/relation/relation-view";
import {useRelationData} from "@/state/relations-data.state";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {RelationViewType} from "@/model/relation-view-state";
import {ViewManager} from "@/model/relation-state/relation-view";

export function hasSettingsPanel(viewType: RelationViewType): boolean {
    return ViewManager.instance.getSettingsComponent(viewType) !== null;
}

export function ViewSettingsPanel(props: RelationViewProps) {
    const data = useRelationData(props.relationState);
    const viewType = props.relationState.viewState.selectedView;
    const SettingsComponent = ViewManager.instance.getSettingsComponent(viewType);

    if (!SettingsComponent || !data) return null;

    const contentProps: RelationViewContentProps = {...props, data};
    return <SettingsComponent {...contentProps}/>;
}
