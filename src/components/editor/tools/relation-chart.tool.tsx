// RelationChartBlockTool.tsx
import type {BlockToolConstructorOptions} from '@editorjs/editorjs';

import {RelationActions} from "@/state/relations/actions/static-actions";

import {ICON_CHART,} from "@/components/editor/tools/icons";
import {RELATION_BLOCK_NAME} from "@/components/editor/tool-names";
import {isRelationState} from "@/components/editor/tools/utils";
import RelationBlockTool from "@/components/editor/tools/relation.tool";
import {useRelationsState} from "@/state/relations.state";


export default class RelationChartBlockTool extends RelationBlockTool {

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Chart',
            icon: ICON_CHART,
        };
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<any>) {
        if (isRelationState(data)) {
            // Old format: migrate to state.relations (parent constructor handles the rest)
        } else if (data?.id) {
            // New format: load from state.relations; if missing, create chart default
            const loaded = useRelationsState.getState().relations[data.id];
            if (!loaded) {
                data = RelationActions.create({viewType: 'chart'});
            }
        } else {
            data = RelationActions.create({viewType: 'chart'});
        }
        super({data, api, readOnly, config}, RELATION_BLOCK_NAME);
    }

    // save and destroy methods are inherited from BaseBlockTool
}
