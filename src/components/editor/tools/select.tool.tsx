

// RelationBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useEffect, useState} from 'react';

import {
    getInitialParams,
    getQueryFromParamsUnchecked,
    RelationState,
    ViewQueryParameters
} from '@/model/relation-state';
import {DashboardDataView, updateRelationDataWithParamsSkeleton} from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {getInitViewState, RelationViewType} from "@/model/relation-view-state";
import {RelationBlockData, RelationComponent} from "@/components/editor/tools/relation.tool";
import {getRandomId} from "@/platform/id-utils";
import {Relation, RelationSourceQuery} from "@/model/relation";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";

export const SELECT_BLOCK_TYPE = 'select';

const ICON_SELECT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-arrow-down-icon lucide-square-arrow-down"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/></svg>'


export function getInitialSelectDataElement(): RelationBlockData {

    const randomId = getRandomId();
    const baseQuery = "SELECT 'Option ' || range from range(5);";
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "New Select Query"
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


export default class SelectBlockTool implements BlockTool {
    private readonly api: API;
    private data: RelationBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    static get isReadOnlySupported() {
        return true;
    }

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Select Input',
            icon: ICON_SELECT,
        };
    }



    public static isRelationBlockData(data: any): data is RelationBlockData {
        return data && typeof data === 'object' && 'viewState' in data;
    }

    constructor({data, api, readOnly}: BlockToolConstructorOptions<RelationBlockData>) {
        this.api = api;
        this.readOnly = readOnly;
        if (SelectBlockTool.isRelationBlockData(data)) {
            this.data = data;
        } else {
            this.data = getInitialSelectDataElement();
        }
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
                initialData={this.data}
                onDataChange={(updatedData: RelationBlockData) => {
                    this.data = updatedData;
                }}
            />
        );

        return this.wrapper;
    }


    public renderSettings(): HTMLElement | MenuConfig {
        return [];
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
