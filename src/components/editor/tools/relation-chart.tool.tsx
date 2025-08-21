// RelationBlockTool.tsx
import type {BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {RelationState, ViewQueryParameters} from '@/model/relation-state';
import {DashboardDataView, updateRelationDataWithParamsSkeleton} from '@/components/dashboard/dashboard-data-view';
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
