// SelectBlockTool.tsx
import type {BlockToolConstructorOptions} from '@editorjs/editorjs';
import React from 'react';

import {getInitialParams, getQueryFromParamsUnchecked} from '@/model/relation-state';
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {getInitViewState} from "@/model/relation-view-state";
import {ICON_EYE_CLOSE, ICON_EYE_OPEN, ICON_SELECT, ICON_SETTING,} from "@/components/editor/tools/icons";
import {RelationBlockData, RelationComponent} from "@/components/editor/tools/relation.tool";
import {getRandomId} from "@/platform/id-utils";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {InputSource} from "@/components/editor/inputs/models";
import {InputValueChangeParams} from "@/components/editor/inputs/input-manager";
import {SELECT_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationBlockData} from "@/components/editor/tools/utils";
import {BaseRelationBlockTool} from "@/components/editor/tools/base-relation-block.tool";


export function getInitialSelectDataElement(): RelationBlockData {

    const randomId = getRandomId();

    const baseQuery = "SELECT 'Option ' || range from range(5);";
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "select_" + randomId.substring(0, 8),
    }
    const defaultQueryParams = getInitialParams();
    const relation: Relation = {
        connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: randomId, name: "New Query", source: source
    }
    const query = getQueryFromParamsUnchecked(relation, defaultQueryParams, baseQuery)
    const initialViewState = getInitViewState(
        'New Data Element',
        undefined,
        [],
        true
    );
    initialViewState.selectedView = 'select';
    return {
        ...relation,
        query: query,
        viewState: initialViewState,
        executionState: {
            state: "not-started"
        }
    }
}

export default class SelectBlockTool extends BaseRelationBlockTool {

    private currentSelectValue?: string;
    private currentSelectName: string;

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Select Input',
            icon: ICON_SELECT,
        };
    }

    public setShowConfig(show: boolean) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                selectState: {
                    ...this.data.viewState.selectState,
                    showConfig: show,
                }
            }
        }
        this.render();
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<RelationBlockData>) {
        super({data, api, readOnly, config}, SELECT_BLOCK_NAME);

        if (isRelationBlockData(data)) {
            this.data = data;
        } else {
            this.data = getInitialSelectDataElement();
        }

        this.currentSelectValue = this.data.viewState.selectState.value;
        this.currentSelectName = this.data.viewState.selectState.name;

        if (this.inputManager){
            const inputSource: InputSource = {
                blockId: this.interactiveId,
                inputName: this.data.viewState.selectState.name,
                inputValue: {
                    value: this.currentSelectValue
                }
            }
            console.log('SelectBlockTool inputSource', inputSource);
            this.inputManager?.registerInputSource(inputSource)
        }
    }

    onSelectChanged(value?: string) {
        const params: InputValueChangeParams = {
            interactiveId: this.interactiveId,
            inputName: this.data.viewState.selectState.name,
            inputValue: {
                value: value
            }
        }
        this.inputManager.onInputValueChange(params);
    }

    onSelectNameChanged(name: string, oldName: string) {
        const oldInputSource = {
            blockId: this.interactiveId!,
            inputName: oldName,
            inputValue: {
                value: this.currentSelectValue
            }
        }
        const newInputSource = {
            blockId: this.interactiveId!,
            inputName: name,
            inputValue: {
                value: this.currentSelectValue
            }
        }
        this.inputManager.updateInputSource(oldInputSource, newInputSource);
    }

    public onDataChanged(updatedData: RelationBlockData): void {
        super.onDataChanged(updatedData);
        if (this.data.viewState.selectState.value !== this.currentSelectValue) {
            this.currentSelectValue = this.data.viewState.selectState.value;
            this.onSelectChanged(this.currentSelectValue);
        }
        if (this.data.viewState.selectState.name !== this.currentSelectName && this.currentSelectName) {
            const oldName = this.currentSelectName;
            const newName = this.data.viewState.selectState.name;
            this.onSelectNameChanged(newName, oldName);
            this.currentSelectName = this.data.viewState.selectState.name;
        }
    }


    public renderSettings(): HTMLElement | MenuConfig {

        const codeVisibility = this.data.viewState.codeFenceState.show;
        const codeText = codeVisibility ? 'Hide Query' : 'Show Query';


        const showConfig = this.data.viewState.selectState.showConfig ?? false;
        const showConfigTest = showConfig ? 'Hide Config' : 'Show Config';

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
                title: showConfigTest,
                closeOnActivate: true,
                icon: ICON_SETTING,
                onActivate: () => {
                    this.setShowConfig(!showConfig);
                }
            }
        ]
    }

    // save and destroy methods are inherited from BaseBlockTool
}
