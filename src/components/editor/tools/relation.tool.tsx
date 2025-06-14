// RelationBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {getVariablesUsedByQuery, RelationState, ViewQueryParameters} from '@/model/relation-state';
import {DashboardDataView, updateRelationDataWithParamsSkeleton} from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {RelationViewType} from "@/model/relation-view-state";

import {dependenciesAreEqual, InputDependency, InputValue} from "@/components/editor/inputs/models";
import {InputManager, InteractiveBlock, StringReturnFunction} from "@/components/editor/inputs/input-manager";
import {getRandomId} from "@/platform/id-utils";
import {
    ICON_CAPTIONS_OFF,
    ICON_CHART,
    ICON_EYE_CLOSE,
    ICON_EYE_OPEN,
    ICON_SETTING,
    ICON_TABLE
} from "@/components/editor/tools/icons";
import {RELATION_BLOCK_NAME} from "@/components/editor/tool-names";

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

export default class RelationBlockTool implements BlockTool, InteractiveBlock {
    private readonly api: API;
    public data: RelationBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    interactiveId: string;
    private readonly inputManager: InputManager;
    private currentInputDependencies: InputDependency[];

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

    getInteractiveId(returnFunction: StringReturnFunction): void {
        returnFunction(this.interactiveId);
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
        this.interactiveId = getRandomId(32);
        console.log("RelationBlockTool InputManager", this.inputManager);
        this.currentInputDependencies = [];
        if (this.inputManager) {
            this.getAndUpdateInputDependencies();
        }
    }

    getAndUpdateInputDependencies(): void {

        // Remove old dependencies
        const query = this.data.query.baseQuery;
        const inputVariableNames = getVariablesUsedByQuery(query);
        const currentDependencies = [];
        for (const inputName of inputVariableNames) {
            const dependency = {
                blockId: this.interactiveId,
                inputName: inputName,
                callFunction: async (inputValue: InputValue) => {
                    this.setInputValue(inputName, inputValue);
                }
            };
            currentDependencies.push(dependency);
        }

        for (const oldDependency of this.currentInputDependencies) {
            const found = currentDependencies.find((newDependency) => {
                return dependenciesAreEqual(oldDependency, newDependency);
            });
            if (!found) {
                this.inputManager.removeInputDependency(oldDependency);
            }
        }

        // all new dependencies that are not in the old dependencies, add them
        for (const newDependency of currentDependencies) {
            const found = this.currentInputDependencies.find((oldDependency) => {
                return dependenciesAreEqual(oldDependency, newDependency);
            });
            if (!found) {
                this.inputManager.registerInputDependency(newDependency);
            }
        }
        this.currentInputDependencies = currentDependencies;
    }

    onDataChanged(value: RelationBlockData) {
        this.data = value;
        this.getAndUpdateInputDependencies();
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
                onDataChange={this.onDataChanged.bind(this)}
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
