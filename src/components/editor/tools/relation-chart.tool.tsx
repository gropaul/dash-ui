// RelationBlockTool.tsx
import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {getInitialDataElement} from "@/model/dashboard-state";

import {

    ICON_CHART,
} from "@/components/editor/tools/icons";
import {RELATION_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationBlockData} from "@/components/editor/tools/utils";
import RelationBlockTool, {RelationBlockData} from "@/components/editor/tools/relation.tool";


export default class RelationChartBlockTool extends RelationBlockTool {

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Chart',
            icon: ICON_CHART,
        };
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<RelationBlockData>) {
        if (!isRelationBlockData(data)) {
            data = getInitialDataElement('chart');
        }
        super({data, api, readOnly, config}, RELATION_BLOCK_NAME);

    }

    // save and destroy methods are inherited from BaseBlockTool
}
