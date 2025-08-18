/**
 * Build styles
 */
import {API, BlockTune, PasteEvent} from '@editorjs/editorjs';
import {createRoot, Root} from 'react-dom/client'; // <-- we will render React headings
import React from 'react';

import {H1, H2, H3, H4, H5, Muted, Strong} from "@/components/ui/typography";
import {IconH1, IconH2, IconH3, IconH4, IconH5, IconH6, IconHeading} from '@codexteam/icons';

/**
 * Data format for the heading block
 */
export interface HeaderData {
    text: string;
    level: number;
}

/**
 * Tool configuration object
 */
export interface HeaderConfig {
    placeholder?: string;
    levels?: number[];
    defaultLevel?: number;
}

/**
 * Internal interface for heading level objects
 */
interface Level {
    number: number;
    reactComponent: React.ComponentType<React.PropsWithChildren<any>>;
    svg: string;
}

/**
 * Constructor arguments
 */
interface ConstructorArgs {
    data: Partial<HeaderData>;
    config: HeaderConfig;
    api: API;
    readOnly: boolean;
}

/**
 * Our custom Header tool for EditorJS that uses React-based headings
 */
export default class Header {
    /**
     * EditorJS API
     */
    private api: API;

    /**
     * Whether we are in read-only mode
     */
    private readOnly: boolean;

    /**
     * The tool’s configuration
     */
    private _settings: HeaderConfig;

    /**
     * Internal data
     */
    private _data: HeaderData;

    /**
     * Main container where we'll mount our React heading
     */
    private _element: HTMLDivElement;

    /**
     * React root for rendering the heading component
     */
    private _reactRoot: Root | null = null;

    /**
     * Keep track of the current heading level
     */
    private get currentLevel(): Level {
        const found = this.levels.find((lvl) => lvl.number === this._data.level);
        return found || this.defaultLevel;
    }

    /**
     * Available heading levels and their associated React components/icons
     */
    private get levels(): Level[] {

        const baseLevels = [
            {
                number: 1,
                reactComponent: H2,
                svg: IconH1
            },
            {
                number: 2,
                reactComponent: H3,
                svg: IconH2
            },
            {
                number: 3,
                reactComponent: H4,
                svg: IconH3
            },
            {
                number: 4,
                reactComponent: H5,
                svg: IconH4
            },
            {
                number: 5,
                reactComponent: Strong,
                svg: IconH5
            },
            {
                number: 6,
                reactComponent: Muted,
                svg: IconH6
            },
        ];

        // If config.levels is provided, filter out unwanted levels
        if (this._settings.levels && this._settings.levels.length > 0) {
            return baseLevels.filter((l) => this._settings.levels!.includes(l.number));
        }
        return baseLevels;
    }

    /**
     * Default level (if not specified)
     */
    private get defaultLevel(): Level {
        if (this._settings.defaultLevel) {
            const maybe = this.levels.find((lvl) => lvl.number === this._settings.defaultLevel);
            if (maybe) return maybe;
            console.warn(`Heading Tool: the default level ${this._settings.defaultLevel} is not in the configured levels.`);
        }
        // fallback to second heading in the list (commonly "level 2")
        return this.levels[1] || this.levels[0];
    }

    /**
     * CSS classes
     */
    private get _CSS() {
        return {
            block: this.api.styles.block,
            wrapper: 'ce-header',
        };
    }

    /**
     * Constructor
     */
    constructor({data, config, api, readOnly}: ConstructorArgs) {
        this.api = api;
        this.readOnly = readOnly;
        this._settings = config;

        // normalize data
        this._data = this.normalizeData(data);

        // Create a container DIV where we will mount our React heading
        this._element = document.createElement('div');
        // add outline none to the container
        this._element.style.outline = 'none';
        this._element.classList.add(this._CSS.wrapper);
        this._element.classList.add(this.api.styles.block);

        // If you want the entire block to be "contentEditable" (not typical for a React component)
        // you might do so here. Typically you'd handle text changes with React or some custom logic.
        // For demonstration, we'll mark the container contentEditable only if readOnly is false.
        this._element.contentEditable = this.readOnly ? 'false' : 'true';

        // Provide a placeholder via data attribute
        this._element.dataset.placeholder = this.api.i18n.t(this._settings.placeholder || '');

        // Initialize the React root inside this container
        this._reactRoot = createRoot(this._element);

        // Render the heading content right away
        this.renderReactHeading();
    }

    /**
     * The method that EditorJS calls to get the block’s main DOM element
     */
    public render(): HTMLDivElement {
        return this._element;
    }

    /**
     * Re-renders the React heading into our container.
     * If you'd like live text-editing, you'd also need to handle onInput or onChange in React
     * to push changes back to EditorJS block data.
     */
    private renderReactHeading(): void {
        if (!this._reactRoot) return;

        const {reactComponent: Heading} = this.currentLevel;

        this._reactRoot.render(
            <Heading
                // For a typical read–write scenario, you'd probably NOT do dangerouslySetInnerHTML,
                // but rather store text in state, let the user type, etc. This is just demonstration.
                dangerouslySetInnerHTML={{__html: this._data.text}}
            />
        );
    }

    /**
     * Merges new data into current block
     */
    public merge(data: HeaderData): void {
        // Simple example: just append the text
        this._data.text += data.text;
        this.renderReactHeading();
    }

    /**
     * Validates the block data
     */
    public validate(blockData: HeaderData): boolean {
        return blockData.text.trim() !== '';
    }

    /**
     * Called by EditorJS to extract and save block data
     */
    public save(): HeaderData {
        // If you were truly editing text in React, you’d have some state
        // changes to keep this._data.text up to date. For example, you could:
        //   - Listen to onInput in the container
        //   - Or store text in local React state and set `_data.text` whenever it changes
        return {
            text: this.getInnerHtml(),
            level: this._data.level,
        };
    }

    /**
     * Getter for the data
     */
    get data(): HeaderData {
        return {
            ...this._data,
            text: this.getInnerHtml()
        }
    }

    /**
     * Setter for data: updates state & re-renders
     */
    set data(newData: HeaderData) {
        this._data = this.normalizeData(newData);
        // re-render the heading in React
        this.renderReactHeading();
    }

    isHeaderData(data: any): data is HeaderData {
        return (data as HeaderData).text !== undefined;
    }
    /**
     * Normalizes the input data
     */
    normalizeData(data: HeaderData | {}): HeaderData {
        const newData: HeaderData = { text: '', level: this.defaultLevel.number };

        if (this.isHeaderData(data)) {
            newData.text = data.text || '';

            if (data.level !== undefined && !isNaN(parseInt(data.level.toString()))) {
                newData.level = parseInt(data.level.toString());
            }
        }

        return newData;
    }

    private getInnerHtml(): string {
        return this._element.children[0].innerHTML;
    }
    /**
     * Sets a new heading level (used in the tunes/settings)
     */
    public setLevel(level: number): void {
        this.data = {
            text: this.getInnerHtml(),
            level,
        };
    }

    /**
     * Tunes for switching levels
     */
    public renderSettings(): BlockTune[] {
        return this.levels.map((lvl) => {
            return {
                icon: lvl.svg,
                label: this.api.i18n.t(`Heading ${lvl.number}`),
                onActivate: () => this.setLevel(lvl.number),
                closeOnActivate: true,
                isActive: this.currentLevel.number === lvl.number,
                // Some EditorJS UIs let you provide a custom render,
                // but if you just want an icon & label, you can leave it at that
                render: () => document.createElement('div'),
            };
        });
    }

    /**
     * Paste handling: If user pastes an <h1>..<h6>, convert to our heading
     */

    public onPaste(event: PasteEvent): void {
        const {detail} = event;

        if ('data' in detail) {
            const content = detail.data as HTMLElement;
            let level = this.defaultLevel.number;
            switch (content.tagName) {
                case 'H1':
                    level = 1;
                    break;
                case 'H2':
                    level = 2;
                    break;
                case 'H3':
                    level = 3;
                    break;
                case 'H4':
                    level = 4;
                    break;
                case 'H5':
                    level = 5;
                    break;
                case 'H6':
                    level = 6;
                    break;
            }

            // If settings.levels is specified, clamp to nearest
            if (this._settings.levels) {
                level = this._settings.levels.reduce((prev, curr) =>
                    Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
                );
            }

            this.data = {
                level,
                text: content.innerText,
            };
        }
    }

    /**
     * Tells EditorJS which tags to handle onPaste
     */
    static get pasteConfig() {
        return {
            tags: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
        };
    }

    /**
     * Provide instructions on how to convert to/from other blocks
     */
    static get conversionConfig() {
        return {
            import: 'text',
            export: 'text',
        };
    }

    /**
     * Sanitizer rules
     */
    static get sanitize() {
        return {
            level: false,
            text: {},
        };
    }

    /**
     * Let EditorJS know this tool supports read-only mode
     */
    static get isReadOnlySupported() {
        return true;
    }

    /**
     * Toolbox button (icon/title)
     */
    static get toolbox() {
        return {
            title: 'Heading',
            icon: IconHeading,

        };
    }
}
