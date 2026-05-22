"use client"

import React from 'react';
import {RelationViewProps} from "@/components/relation/relation-view";
import {useRelationData} from "@/state/relations-data.state";
import {ChartConfigView} from "@/components/relation/chart/chart-config-view";
import {SliderSettingsContent} from "@/components/relation/slider/slider-settings-content";
import {RelationViewContentProps} from "@/components/relation/relation-view-content";
import {RelationViewType} from "@/model/relation-view-state";

type SettingsComponent = React.ComponentType<RelationViewContentProps>;

function getSettingsComponent(viewType: RelationViewType): SettingsComponent | null {
    switch (viewType) {
        case 'chart': return ChartConfigView;
        case 'slider': return SliderSettingsContent;
        default: return null;
    }
}

export function hasSettingsPanel(viewType: RelationViewType): boolean {
    return getSettingsComponent(viewType) !== null;
}

export function ViewSettingsPanel(props: RelationViewProps) {
    const data = useRelationData(props.relationState);
    const viewType = props.relationState.viewState.selectedView;
    const SettingsComponent = getSettingsComponent(viewType);

    if (!SettingsComponent || !data) return null;

    const contentProps: RelationViewContentProps = {...props, data};
    return <SettingsComponent {...contentProps}/>;
}
