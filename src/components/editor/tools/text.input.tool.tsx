// SelectBlockTool.tsx
import type {BlockToolConstructorOptions, PasteEvent} from '@editorjs/editorjs';

import {getInitialParamsTable, getInitialParamsTextInput, getQueryFromParamsUnchecked} from '@/model/relation-state';
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {getInitViewState} from "@/model/relation-view-state";
import {ICON_EYE_CLOSE, ICON_EYE_OPEN, ICON_SEARCH, ICON_SELECT, ICON_SETTING,} from "@/components/editor/tools/icons";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {getRandomId} from "@/platform/id-utils";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {InputSource} from "@/components/editor/inputs/models";
import {InputValueChangeParams} from "@/components/editor/inputs/input-manager";
import {SELECT_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationBlockData} from "@/components/editor/tools/utils";
import {BaseRelationBlockTool} from "@/components/editor/tools/base-relation-block.tool";
import {InputType} from "@/model/relation-view-state/select";


export function getInitialSelectDataElement(inputType: InputType): RelationBlockData {

    let baseQuery = '';
    if (inputType === 'select') {
        baseQuery = "SELECT 'Option ' || range from range(5); -- E.g. SELECT DISTINCT type FROM table";
    } else if (inputType === 'fulltext') {
        baseQuery = "SELECT 'Suggestion' LIMIT 0; -- No data initially";
    }

    const randomId = getRandomId();

    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "select_" + randomId.substring(0, 8),
    }
    const defaultQueryParams = getInitialParamsTextInput();
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

    initialViewState.inputTextState.inputType = inputType;

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

export class TextInputBlockTool extends BaseRelationBlockTool {

    private currentSelectValue?: string;
    private currentSelectName: string;


    public setShowConfig(show: boolean) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
                inputTextState: {
                    ...this.data.viewState.inputTextState,
                    showConfig: show,
                }
            }
        }
        this.render();
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<RelationBlockData>) {

       console.log("TextInputBlockTool constructor", data, config, api);
        if (!isRelationBlockData(data)) {
            data = getInitialSelectDataElement(config.type);
        }

        super({data, api, readOnly, config}, SELECT_BLOCK_NAME);

        this.currentSelectValue = this.data.viewState.inputTextState.value;
        this.currentSelectName = this.data.viewState.inputTextState.name;

        if (this.inputManager){
            const inputSource: InputSource = {
                blockId: this.interactiveId,
                inputName: this.data.viewState.inputTextState.name,
                inputValue: {
                    value: this.currentSelectValue
                }
            }
            this.inputManager?.registerInputSource(inputSource)
        }
    }

    onValueChanged(value?: string) {
        const params: InputValueChangeParams = {
            interactiveId: this.interactiveId,
            inputName: this.data.viewState.inputTextState.name,
            inputValue: {
                value: value
            }
        }
        this.inputManager.onInputValueChange(params);
    }

    onInputNameChanged(name: string, oldName: string) {
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
        if (this.data.viewState.inputTextState.value !== this.currentSelectValue) {
            this.currentSelectValue = this.data.viewState.inputTextState.value;
            this.onValueChanged(this.currentSelectValue);
        }
        if (this.data.viewState.inputTextState.name !== this.currentSelectName && this.currentSelectName) {
            const oldName = this.currentSelectName;
            const newName = this.data.viewState.inputTextState.name;
            this.onInputNameChanged(newName, oldName);
            this.currentSelectName = this.data.viewState.inputTextState.name;
        }
    }


    public renderSettings(): HTMLElement | MenuConfig {

        const codeVisibility = this.data.viewState.codeFenceState.show;
        const codeText = codeVisibility ? 'Hide Query' : 'Show Query';


        const showConfig = this.data.viewState.inputTextState.showConfig ?? false;
        const showConfigTest = showConfig ? 'Hide Config' : 'Show Config';

        return [
            ...super.renderSettings(),
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

export class SelectTextInputBlockTool extends TextInputBlockTool {
    // Editor.js config
    static get toolbox() {
        return {
            title: 'Select Input',
            icon: ICON_SELECT,
        };
    }
}


export class FullTextInputBlockTool extends TextInputBlockTool {
    // Editor.js config
    static get toolbox() {
        return {
            title: 'Fulltext Input',
            icon: ICON_SEARCH,
        };
    }
}



