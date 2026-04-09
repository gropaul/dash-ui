// BaseBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool} from '@editorjs/editorjs';
import React from 'react';
import {
    InputManager,
    InteractiveBlock,
    isInteractiveBlock,
    StringReturnFunction
} from "@/components/editor/inputs/input-manager";
import {getRandomId} from "@/platform/id-utils";
import {RelationComponent} from "@/components/editor/tools/relation.tool";
import {getVariablesUsedByQuery, RelationState} from "@/model/relation-state";
import {dependenciesAreEqual, InputDependency, InputValue} from "@/components/editor/inputs/models";
import {ICON_EYE_CLOSE, ICON_EYE_OPEN, ICON_RUN} from "@/components/editor/tools/icons";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {EndUserRelationActions, getRelationActions} from "@/state/relations/actions/end-user-actions";
import {RelationViewMode} from "@/model/relation-view-state";

/**
 * Base class for block tools that share common functionality
 * Implements common methods and properties used by both SelectBlockTool and RelationBlockTool
 */

const VIEW_MODE: RelationViewMode = 'embedded'

export abstract class BaseRelationBlockTool implements BlockTool, InteractiveBlock {
    protected readonly api: API;
    protected data: RelationState;
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
        data: RelationState,
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
            console.log("Checking block for interactive relation block", block.name, block.id);
            if (isInteractiveBlock(block.name)) {
                console.warn(`Block ${block.name} with id ${block.id} is an interactive block, checking relation id...`);
                let otherRelationId = '';
                let getRelationIdFun = (id: string) => {
                    otherRelationId = id;
                }
                block.call("getRelationId", getRelationIdFun);
                console.log("Relation id for block", block.name, block.id, "is", otherRelationId);
                // if there is a block with the same relation id so we have to make our block a copy
                if (otherRelationId === this.data.id) {
                    console.log("Found another block with the same relation id, creating a copy of the relation for this block", block.name, block.id);
                    this.data = RelationActions.copy(this.data);
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

    updateAndRender(newData: RelationState) {
        this.data = newData;
        this.render();
    }

    getActions(): EndUserRelationActions {
        return getRelationActions({
            mode: VIEW_MODE,
            relationState: this.data,
            updateRelation: this.updateAndRender.bind(this),
            inputManager: this.inputManager,
        });
    }

    public async rerunQuery() {
        await this.getActions().updateRelationDataWithBaseQuery(this.data.query.baseQuery);
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
        const session = this.getActions().getSessionState(VIEW_MODE);
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                fullscreenSessionState: {
                    ...session,
                    codeFenceState: {...session.codeFenceState, show},
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

    public onDataChanged(updatedData: RelationState): void {
        // check if the sql is different and if yes register
        // the input source
        if (updatedData.query.baseQuery !== this.data.query.baseQuery) {
            this.getAndUpdateInputDependencies(updatedData.query.baseQuery);
        }
        this.data = updatedData;
    }

    // Abstract method to be implemented by subclasses
    public renderSettings(): HTMLElement | any {


        const codeVisibility = this.getActions().getSessionState(VIEW_MODE).codeFenceState.show;
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
                    this.rerunQuery.bind(this)();
                },
            },
        ]
    }

    // Common save method
    public save(): RelationState {
        return this.data;
    }

    // Common destroy method
    public destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }
}