// RelationBlockTool.tsx
import type {API, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {RelationState, ViewQueryParameters} from '@/model/relation-state';
import {DashboardDataView} from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {RelationViewType} from "@/model/relation-view-state";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {
    ICON_CAPTIONS_OFF,
    ICON_CHART,
    ICON_SETTING,
    ICON_TABLE
} from "@/components/editor/tools/icons";
import {RELATION_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationBlockData} from "@/components/editor/tools/utils";
import {BaseRelationBlockTool} from "@/components/editor/tools/base-relation-block.tool";
import {updateRelationDataWithParams} from "@/state/relations/functions";

export interface RelationBlockData extends RelationState {
}

/**
 * React wrapper that will:
 * 1. Manage local state
 * 2. Update the tool's data reference whenever changes occur
 */

export interface RelationComponentProps {
    initialData: RelationBlockData,
    onDataChange: (data: RelationBlockData) => void,
    inputManager: InputManager;
}

export function RelationComponent(props: RelationComponentProps) {

    const {initialData, onDataChange, inputManager} = props;
    // Keep a React state that holds the data needed for your component
    const [localData, setLocalData] = useState<RelationBlockData>(initialData);

    // update if the data changes
    useEffect(() => {
        setLocalData(initialData);
    }, [initialData]);

    function handleUpdate(newData: RelationBlockData) {
        setLocalData(newData);
        onDataChange(newData); // sync back to the block tool
    }

    return (
        <DashboardDataView
            onRelationUpdate={handleUpdate}
            relation={localData}
            inputManager={inputManager}
        />
    );
}

export default class RelationBlockTool extends BaseRelationBlockTool {

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Data Table',
            icon: ICON_TABLE,
        };
    }

    protected constructor({data, api, readOnly, config}: {
        data: RelationBlockData,
        api: API,
        readOnly: boolean,
        config: any
    }, blockName: string) {

        if (!isRelationBlockData(data)) {
            data = getInitialDataElement('table');
        }
        super({data, api, readOnly, config}, RELATION_BLOCK_NAME);
    }

    public async setViewType(viewType: RelationViewType) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                selectedView: viewType,
            }
        }
        const currentPrams = this.data.query.viewParameters;
        const newParams: ViewQueryParameters = {
            ...currentPrams,
            type: viewType,
        }
        await updateRelationDataWithParams(this.data, newParams, this.updateAndRender.bind(this), this.inputManager);
    }

    public showChartSettings(show: boolean) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                chartState: {
                    ...this.data.viewState.chartState,
                    view: {
                        ...this.data.viewState.chartState.view,
                        showConfig: show,
                    }
                }
            }
        }
        this.render();
    }


    public renderSettings(): HTMLElement | MenuConfig {

        const superSettings = super.renderSettings();
        const chartSettingsVisible = this.data.viewState.chartState.view.showConfig;
        const chartSettingsText = chartSettingsVisible ? 'Hide Chart Settings' : 'Show Chart Settings';

        const selectedView = this.data.viewState.selectedView;
        const viewOptions: { type: RelationViewType, icon: string, label: string }[] = [
            {
                type: 'table',
                label: 'View as Table',
                icon: ICON_TABLE,
            }, {
                type: 'chart',
                label: 'View as Chart',
                icon: ICON_CHART,
            }
        ];
        const remainingViews = viewOptions.filter(v => v.type !== selectedView);

        return [
            ...superSettings,
            ...remainingViews.map(v => ({
                title: v.label,
                icon: v.icon,
                closeOnActivate: true,
                onActivate: () => {
                    this.setViewType(v.type);
                }
            })),
            ...(selectedView === 'chart') ? [{
                title: chartSettingsText,
                icon: chartSettingsVisible ? ICON_CAPTIONS_OFF : ICON_SETTING,
                closeOnActivate: true,
                onActivate: () => {
                    this.showChartSettings(!chartSettingsVisible);
                }
            }] : []
        ]
    }

    // save and destroy methods are inherited from BaseBlockTool
}
