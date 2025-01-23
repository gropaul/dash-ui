// RelationBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, { useState } from 'react';

import { RelationState } from '@/model/relation-state';
import { DashboardDataView } from '@/components/dashboard/dashboard-data-view';
import {getInitialDataElement} from "@/model/dashboard-state";

export interface RelationBlockData extends RelationState {}

/**
 * React wrapper that will:
 * 1. Manage local state
 * 2. Update the tool's data reference whenever changes occur
 */
function RelationComponent({
                               initialData,
                               onDataChange,
                           }: {
    initialData: RelationBlockData,
    onDataChange: (data: RelationBlockData) => void,
}) {

    // Keep a React state that holds the data needed for your component
    const [localData, setLocalData] = useState<RelationBlockData>(initialData);

    function handleUpdate(newData: RelationBlockData) {
        setLocalData(newData);
        onDataChange(newData); // sync back to the block tool
    }

    return (
        <DashboardDataView
            onRelationUpdate={handleUpdate}
            relation={localData}
        />
    );
}

export default class RelationBlockTool implements BlockTool {
    private readonly api: API;
    private data: RelationBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Relation',
            icon: '...',
        };
    }

    constructor({ data, api, readOnly }: BlockToolConstructorOptions<RelationBlockData>) {
        this.api = api;
        this.readOnly = !!readOnly;
        this.data = data ?? { ...getInitialDataElement() };
    }

    public render(): HTMLElement {
        this.wrapper = document.createElement('div');
        this.reactRoot = createRoot(this.wrapper);

        this.reactRoot.render(
            <RelationComponent
                initialData={this.data}
                onDataChange={(updatedData: RelationBlockData) => {
                    // store the new data in the tool, but don't re-call render()
                    this.data = updatedData;
                }}
            />
        );

        return this.wrapper;
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
