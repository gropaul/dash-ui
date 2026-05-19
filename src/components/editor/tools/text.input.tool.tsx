// SelectBlockTool.tsx
import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {RelationState} from '@/model/relation-state';
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {getInitViewState} from "@/model/relation-view-state";
import {ICON_SEARCH, ICON_SELECT, ICON_SETTING,} from "@/components/editor/tools/icons";
import {getRandomId} from "@/platform/id-utils";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {InputSource} from "@/components/editor/inputs/models";
import {InputValueChangeParams} from "@/components/editor/inputs/input-manager";
import {SELECT_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationState} from "@/components/editor/tools/utils";
import {BaseRelationBlockTool} from "@/components/editor/tools/base-relation-block.tool";


export function getInitialSelectDataElement(): RelationState {

    let baseQuery = '';
    baseQuery = "SELECT 'Option ' || range + 1 from range(5); -- E.g. SELECT DISTINCT type FROM table";


    const randomId = getRandomId();

    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "select_" + randomId.substring(0, 8),
    }
    const relation: Relation = {
        connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: randomId, source: source
    }
    const initialViewState = getInitViewState(
        'New Data Element',
        undefined,
        [],
        true
    );

    // initialViewState.selectState.selectType = inputType;

    initialViewState.selectedView = 'select';
    throw new Error("Not implemented, sorry we don't support this yet");
    // return {
    //     ...relation,
    //     query: {
    //         baseQuery: baseQuery,
    //         activeBaseQuery: baseQuery,
    //         viewParameters: {
    //
    //         }
    //     },
    //     viewState: initialViewState,
    //     executionState: {
    //         state: "not-started"
    //     }
    // }
}

export class TextInputBlockTool extends BaseRelationBlockTool {

    private currentSelectValue?: string;
    // private currentSelectName: string;


    public setShowConfig(show: boolean) {
        this.data = {
            ...this.data,
            viewState: {
                ...this.data.viewState,
            }
        }
        this.render();
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<RelationState>) {

        if (!isRelationState(data)) {
            data = getInitialSelectDataElement();
        }
        //
        super({data, api, readOnly, config}, SELECT_BLOCK_NAME);
        //
        // this.currentSelectValue = this.data.viewState.selectState.value;
        // this.currentSelectName = this.data.viewState.selectState.name;
        //
        // if (this.inputManager) {
        //     const inputSource: InputSource = {
        //         blockId: this.interactiveId,
        //         inputName: this.data.viewState.selectState.name,
        //         inputValue: {
        //             value: this.currentSelectValue
        //         }
        //     }
        //     this.inputManager?.registerInputSource(inputSource)
        // }
    }

    onValueChanged(value?: string) {
        // const params: InputValueChangeParams = {
        //     interactiveId: this.interactiveId,
        //     inputName: this.data.viewState.selectState.name,
        //     inputValue: {
        //         value: value
        //     }
        // }
        // this.inputManager.onInputValueChange(params);
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

    public onDataChanged(updatedData: RelationState): void {
        super.onDataChanged(updatedData);
        // if (this.data.viewState.selectState.value !== this.currentSelectValue) {
        //     this.currentSelectValue = this.data.viewState.selectState.value;
        //     this.onValueChanged(this.currentSelectValue);
        // }
        // if (this.data.viewState.selectState.name !== this.currentSelectName && this.currentSelectName) {
        //     const oldName = this.currentSelectName;
        //     const newName = this.data.viewState.selectState.name;
        //     this.onInputNameChanged(newName, oldName);
        //     this.currentSelectName = this.data.viewState.selectState.name;
        // }
    }


    public renderSettings(): HTMLElement | MenuConfig {

        const codeVisibility = this.getActions().getSessionState('fullscreen').codeFenceState.show;
        const codeText = codeVisibility ? 'Hide Query' : 'Show Query';


        // const showConfig = this.data.viewState.selectState.showConfig ?? false;
        const showConfig = false;
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



