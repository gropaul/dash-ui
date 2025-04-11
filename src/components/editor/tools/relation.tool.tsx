// RelationBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {RelationState, ViewQueryParameters} from '@/model/relation-state';
import {DashboardDataView, updateRelationDataWithParamsSkeleton} from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {RelationViewType} from "@/model/relation-view-state";

export const RELATION_BLOCK_TYPE = 'relation';

const ICON_TABLE = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sheet icon-smaller"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/><line x1="15" x2="15" y1="9" y2="21"/></svg>';
const ICON_CHART = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline icon-smaller"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>';
const ICON_EYE_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye icon-smaller"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-closed icon-smaller"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>';
const ICON_CAPTIONS_OFF = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-captions-off icon-smaller"><path d="M10.5 5H19a2 2 0 0 1 2 2v8.5"/><path d="M17 11h-.5"/><path d="M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/><path d="m2 2 20 20"/><path d="M7 11h4"/><path d="M7 15h2.5"/></svg>';
const ICON_CAPTIONS = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-captions icon-smaller"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/></svg>';

export interface RelationBlockData extends RelationState {
}

/**
 * React wrapper that will:
 * 1. Manage local state
 * 2. Update the tool's data reference whenever changes occur
 */
function RelationComponent({
                               initialData,
                               onDataChange,
                           }: {
    initialData: RelationBlockData,
    onDataChange: (data: RelationBlockData) => void,
}) {

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
        />
    );
}

export default class RelationBlockTool implements BlockTool {
    private readonly api: API;
    private data: RelationBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    static get isReadOnlySupported() {
        return true;
    }

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Data View',
            icon: ICON_TABLE,
        };
    }



    public static isRelationBlockData(data: any): data is RelationBlockData {
        return data && typeof data === 'object' && 'viewState' in data;
    }

    constructor({data, api, readOnly}: BlockToolConstructorOptions<RelationBlockData>) {
        this.api = api;
        this.readOnly = !!readOnly;
        if (RelationBlockTool.isRelationBlockData(data)) {
            this.data = data;
        } else {
            this.data = getInitialDataElement();
        }
    }

    public render(): HTMLElement {
        if (!this.wrapper) {
            // Create your wrapper the first time
            this.wrapper = document.createElement('div');
            this.wrapper.style.backgroundColor = 'inherit';
            this.reactRoot = createRoot(this.wrapper);
        }

        // Re-render the React component into the (existing) root
        this.reactRoot!.render(
            <RelationComponent
                initialData={this.data}
                onDataChange={(updatedData: RelationBlockData) => {
                    this.data = updatedData;
                }}
            />
        );

        return this.wrapper;
    }


    public setShowCodeFence(show: boolean) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                codeFenceState: {
                    ...this.data.viewState.codeFenceState,
                    show,
                }
            }
        }
        this.render();
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
        const newParams : ViewQueryParameters= {
            ...currentPrams,
            type: viewType,
        }

        await updateRelationDataWithParamsSkeleton(this.data.id, newParams, this.data, (updatedData) => {
            this.data = updatedData;
            this.render();
        });
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

        const codeVisibility = this.data.viewState.codeFenceState.show;
        const codeText = codeVisibility ? 'Hide Query' : 'Show Query';

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
            {
                title: codeText,
                closeOnActivate: true,
                icon: codeVisibility ? ICON_EYE_CLOSE : ICON_EYE_OPEN,
                onActivate: () => {
                    this.setShowCodeFence(!codeVisibility);
                },
            },
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
                icon: chartSettingsVisible ? ICON_CAPTIONS_OFF : ICON_CAPTIONS,
                closeOnActivate: true,
                onActivate: () => {
                    this.showChartSettings(!chartSettingsVisible);
                }
            }] : []
        ]
    }

    public save(): RelationBlockData {
        // Return the final data
        return this.data;
    }

    public destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }
}
