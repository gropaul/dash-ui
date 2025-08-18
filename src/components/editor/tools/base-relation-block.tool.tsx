// BaseBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, PasteEvent} from '@editorjs/editorjs';
import React from 'react';
import {
    InputManager,
    InteractiveBlock,
    isInteractiveBlock,
    StringReturnFunction
} from "@/components/editor/inputs/input-manager";
import {getRandomId} from "@/platform/id-utils";
import {RelationBlockData, RelationComponent} from "@/components/editor/tools/relation.tool";
import {getVariablesUsedByQuery, ViewQueryParameters} from "@/model/relation-state";
import {dependenciesAreEqual, InputDependency, InputValue} from "@/components/editor/inputs/models";
import {updateRelationDataWithParamsSkeleton} from "@/components/dashboard/dashboard-data-view";
import {ICON_EYE_CLOSE, ICON_EYE_OPEN, ICON_RUN, ICON_TABLE} from "@/components/editor/tools/icons";
import {useRelationDataState} from "@/state/relations-data.state";

/**
 * Base class for block tools that share common functionality
 * Implements common methods and properties used by both SelectBlockTool and RelationBlockTool
 */
export abstract class BaseRelationBlockTool implements BlockTool, InteractiveBlock {
    protected readonly api: API;
    protected data: RelationBlockData;
    protected readOnly: boolean;
    protected wrapper: HTMLElement | null = null;
    protected reactRoot: Root | null = null;

    protected currentInputDependencies: InputDependency[];

    interactiveId: string;
    protected inputManager: InputManager;

    static get isReadOnlySupported() {
        return true;
    }

    // Each subclass must implement its own toolbox configuration
    static get toolbox(): { title: string, icon: string } {
        throw new Error('Toolbox configuration must be provided by subclass');
    }

    protected constructor({data, api, readOnly, config}: {
        data: RelationBlockData,
        api: API,
        readOnly: boolean,
        config: any
    }, blockName: string) {

        this.api = api;
        this.readOnly = readOnly;

        this.data = data;

        const numberOfBlocks = this.api.blocks.getBlocksCount();
        for (let i = 0; i < numberOfBlocks; i++) {
            const block = this.api.blocks.getBlockByIndex(i);
            if (!block) {
                continue;
            }
            if (isInteractiveBlock(block.name)) {
                let otherRelationId = '';
                let getRelationIdFun = (id: string) => {
                    otherRelationId = id;
                }
                block.call("getRelationId", getRelationIdFun);

                // if there is a block with the same relation id than we need to update our relation id
                if (otherRelationId === this.data.id) {
                    this.data.id = getRandomId();
                }
            }

        }

        // assert if no input manager is passed
        if (!config.getInputManager) {
            throw new Error('GetInputManager function is required');
        }
        this.inputManager = config.getInputManager(blockName);
        this.interactiveId = getRandomId(32);

        this.currentInputDependencies = [];
        if (this.inputManager) {
            this.getAndUpdateInputDependencies(this.data.query.baseQuery);
        }
    }

    getRelationId(returnFunction: StringReturnFunction): void {
        returnFunction(this.data.id);
    }

    getInteractiveId(returnFunction: StringReturnFunction): void {
        returnFunction(this.interactiveId);
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


    public setInputValue(inputName: string, inputValue: InputValue) {
        this.rerunQuery();
    }

    getAndUpdateInputDependencies(baseQuery: string): void {

        // console.log("Updating input dependencies for block", this.interactiveId, this.data)
        // Remove old dependencies
        const inputVariableNames = getVariablesUsedByQuery(baseQuery);
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

    // Common method to set code fence visibility
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

    // Common render method
    public render(): HTMLElement {
        if (!this.wrapper) {
            // Create your wrapper the first time
            this.wrapper = document.createElement('div');
            this.wrapper.style.backgroundColor = 'inherit';
            this.reactRoot = createRoot(this.wrapper);
        }

        // Render method to be implemented by subclasses
        this.renderComponent();

        return this.wrapper;
    }

    protected renderComponent(): void {
        // Re-render the React component into the (existing) root
        this.reactRoot!.render(
            <RelationComponent
                inputManager={this.inputManager}
                initialData={this.data}
                onDataChange={this.onDataChanged.bind(this)}
            />
        );
    }

    public onDataChanged(updatedData: RelationBlockData): void {
        // check if the sql is different and if yes register
        // the input source
        if (updatedData.query.baseQuery !== this.data.query.baseQuery) {
            this.getAndUpdateInputDependencies(updatedData.query.baseQuery);
        }
        this.data = updatedData;
    }

    // Abstract method to be implemented by subclasses
    public renderSettings(): HTMLElement | any {


        const codeVisibility = this.data.viewState.codeFenceState.show;
        const codeText = codeVisibility ? 'Hide Query' : 'Show Query';

        return [
            {
                title: codeText,
                closeOnActivate: true,
                icon: codeVisibility ? ICON_EYE_CLOSE : ICON_EYE_OPEN,
                onActivate: () => {
                    this.setShowCodeFence(!codeVisibility);
                },
            },
            {
                title: 'Run Query',
                icon: ICON_RUN,
                closeOnActivate: true,
                onActivate: () => {
                    this.rerunQuery();
                },
            },
        ]
    }

    // Common save method
    public save(): RelationBlockData {
        return this.data;
    }

    // Common destroy method
    public destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }
}