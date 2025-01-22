// MyCustomBlock.tsx
import { createRoot, Root } from 'react-dom/client';
import type {
    API,
    BlockTool,
    BlockToolConstructorOptions,
} from '@editorjs/editorjs';

import React from 'react';
import {MyBlockComponent, MyBlockData} from "@/components/editor/tools/custom.component";

export default class MyCustomBlock implements BlockTool {
    /**
     * Editor.js API
     */
    private readonly api: API;

    /**
     * Block data object - will be updated by our React component
     */
    private data: MyBlockData;

    /**
     * Read-only flag
     */
    private readOnly: boolean;

    /**
     * DOM wrapper for this block
     */
    private wrapper: HTMLElement | null = null;

    /**
     * React Root, used to unmount on destroy
     */
    private reactRoot: Root | null = null;

    /**
     * Editor.js requires a `type` or `contentless` property
     * to identify how the tool is treated. We have standard block content.
     */
    static get contentless() {
        return false;
    }

    /**
     * Tool configuration
     */
    constructor({
                    data,
                    api,
                    readOnly,
                }: BlockToolConstructorOptions<MyBlockData>) {
        this.api = api;
        this.data = data || { count: 0 };
        this.readOnly = !!readOnly;
    }

    static get toolbox() {
        return {
            title: 'Custom Block',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
        };
    }

    /**
     * Called by Editor.js to render the block’s main element
     */
    public render(): HTMLElement {
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('my-custom-block-wrapper');

        // Create a React root inside our wrapper
        this.reactRoot = createRoot(this.wrapper);

        // Render our React component, passing data & readOnly
        this.reactRoot.render(
            <MyBlockComponent
                data={this.data}
                readOnly={this.readOnly}
                onDataChange={(newData) => {
                    // Keep the data in sync so `save()` works properly
                    this.data = newData;
                }}
            />
        );

        return this.wrapper;
    }

    /**
     * Called by Editor.js to gather block data
     * that will be saved in the final JSON output
     */
    public save(): MyBlockData {
        // Return the data that our React component updated
        return this.data;
    }

    /**
     * (Optional) Editor.js calls this when removing the block
     * so we can do cleanup if needed (like unmounting React).
     */
    public destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }
}
