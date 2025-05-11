// RelationBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {RelationState, ViewQueryParameters} from '@/model/relation-state';
import {DashboardDataView, updateRelationDataWithParamsSkeleton} from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {RelationViewType} from "@/model/relation-view-state";

import {InputDependency, InputValue} from "@/components/editor/inputs/models";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {getRandomId} from "@/platform/id-utils";

export const RELATION_BLOCK_NAME = 'relation';

export const ICON_TABLE = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sheet icon-smaller"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="9" x2="9" y1="9" y2="21"/><line x1="15" x2="15" y1="9" y2="21"/></svg>';
export const ICON_CHART = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline icon-smaller"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>';
export const ICON_EYE_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye icon-smaller"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
export const ICON_EYE_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-closed icon-smaller"><path d="m15 18-.722-3.25"/><path d="M2 8a10.645 10.645 0 0 0 20 0"/><path d="m20 15-1.726-2.05"/><path d="m4 15 1.726-2.05"/><path d="m9 18 .722-3.25"/></svg>';
export const ICON_CAPTIONS_OFF = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-captions-off icon-smaller"><path d="M10.5 5H19a2 2 0 0 1 2 2v8.5"/><path d="M17 11h-.5"/><path d="M19 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/><path d="m2 2 20 20"/><path d="M7 11h4"/><path d="M7 15h2.5"/></svg>';
export const ICON_CAPTIONS = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-captions icon-smaller"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/></svg>';

export const ICON_SETTING = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
  class="lucide lucide-settings-icon lucide-settings">
  <g transform="scale(0.85) translate(2 2)">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </g>
</svg>`.trim();

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

    console.log("RelationComponent InputManager", inputManager);

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

export default class RelationBlockTool implements BlockTool {
    private readonly api: API;
    public data: RelationBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    private inputBlockId: string;
    private inputManager: InputManager;

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

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<RelationBlockData>) {
        this.api = api;
        this.readOnly = !!readOnly;

        if (RelationBlockTool.isRelationBlockData(data)) {
            this.data = data;
        } else {
            this.data = getInitialDataElement();
        }

        // assert if no input manager is passed
        if (!config.getInputManager) {
            throw new Error('GetInputManager function is required');
        }
        this.inputManager = config.getInputManager(RELATION_BLOCK_NAME);
        this.inputBlockId = getRandomId(32);
        console.log("RelationBlockTool InputManager", this.inputManager);
        if (this.inputManager) {
            const deps = this.findInputDependenciesInRelationTool(this.inputBlockId);
            for (const dep of deps) {
                this.inputManager.registerInputDependency(dep);
            }
        }
    }

    findInputDependenciesInRelationTool(blockId: string): InputDependency[] {
        const query = this.data.query.baseQuery;
        // e.g. "SELECT * FROM table WHERE id = {{inputName}}"
        const regex = /{{(.*?)}}/g;
        const matches = query.match(regex);
        if (!matches) {
            return [];
        }

        const dependencies: InputDependency[] = [];
        for (const match of matches) {
            const inputName = match.replace(/{{|}}/g, "").trim();
            dependencies.push({
                blockId: blockId,
                inputName: inputName,
                callFunction: async (inputValue: InputValue) => {
                    this.setInputValue(inputName, inputValue);
                }
            });
        }
        return dependencies;
    }

    public setInputValue(inputName: string, inputValue: InputValue) {
        this.rerunQuery();
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
                inputManager={this.inputManager}
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

    updateAndRender(newData: RelationBlockData) {
        this.data = newData;
        this.render();
    }

    public async rerunQuery() {

        const currentPrams = this.data.query.viewParameters;
        const newParams: ViewQueryParameters = {
            ...currentPrams,
        }

        await updateRelationDataWithParamsSkeleton(this.data.id, newParams, this.data, this.updateAndRender.bind(this), this.inputManager);
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

        await updateRelationDataWithParamsSkeleton(this.data.id, newParams, this.data, this.updateAndRender.bind(this), this.inputManager);
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
                icon: chartSettingsVisible ? ICON_CAPTIONS_OFF : ICON_SETTING,
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
