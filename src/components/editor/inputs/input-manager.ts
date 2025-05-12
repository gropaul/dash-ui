import {InputDependency, InputSource, InputValue} from "@/components/editor/inputs/models";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {RELATION_BLOCK_NAME} from "@/components/editor/tools/relation.tool";
import {SELECT_BLOCK_NAME} from "@/components/editor/tools/select.tool";
import {TEXT_SEARCH_BLOCK_NAME} from "@/components/editor/tools/text-search.tool";

export interface InputValueChangeParams {
    interactiveId: string;
    inputName: string;
    inputValue: InputValue;
}

const INTERACTIVE_BLOCKS = [
    RELATION_BLOCK_NAME,
    SELECT_BLOCK_NAME,
    TEXT_SEARCH_BLOCK_NAME,
];

export type StringReturnFunction = (id: string) => string;

export interface InteractiveBlock {
    interactiveId: string;
    getInteractiveId: (returnFunction: StringReturnFunction) => void;
}

export const INPUT_EVENTS = {
    SELECT: {
        CHANGE: 'select-change',
    },
    RELATION: {
        ROW_CHANGE: 'relation-row-change',
    },
    TEXT_SEARCH: {
        CHANGE: 'text-search-change',
    },
} as const;

type ExtractValues<T> = T extends string
    ? T
    : T extends Record<string, unknown>
        ? ExtractValues<T[keyof T]>
        : never;
export type InputEventType = ExtractValues<typeof INPUT_EVENTS>;

export function isInteractiveBlock(blockName: string) {
    return INTERACTIVE_BLOCKS.includes(blockName);
}

export class InputManager {
    dependencies: InputDependency[] = [];
    sources: InputSource[] = [];

    registerInputDependency(dependency: InputDependency) {
        // check if the dependency already exists
        const index = this.dependencies.findIndex((d) => d.blockId === dependency.blockId && d.inputName === dependency.inputName);
        if (index === -1) {
            this.dependencies.push(dependency);
        } else {
            // update the existing dependency
            this.dependencies[index] = dependency;
        }
    }

    updateInputDependency(old: InputDependency, newDependency: InputDependency) {
        const index = this.dependencies.findIndex((d) => d.blockId === old.blockId && d.inputName === old.inputName);
        if (index !== -1) {
            this.dependencies[index] = newDependency;
        } else {
            throw new Error(`Dependency not found: ${old.blockId} ${old.inputName}`);
        }
    }

    removeInputDependency(dependency: InputDependency) {
        const index = this.dependencies.findIndex((d) => d.blockId === dependency.blockId && d.inputName === dependency.inputName);
        if (index !== -1) {
            this.dependencies.splice(index, 1);
        } else {
            throw new Error(`Dependency not found: ${dependency.blockId} ${dependency.inputName}`);
        }
    }

    registerInputSource(source: InputSource) {
        // check if the source already exists
        const index = this.sources.findIndex((s) => s.blockId === source.blockId && s.inputName === source.inputName);
        if (index === -1) {
            this.sources.push(source);
        } else {
            // update the existing source
            this.sources[index] = source;
        }

        // set the input value for the source
    }

    updateInputSource(old: InputSource, newSource: InputSource) {
        const index = this.sources.findIndex((s) => s.blockId === old.blockId && s.inputName === old.inputName);
        if (index !== -1) {
            this.sources[index] = newSource;
        } else {
            throw new Error(`Source not found: ${old.blockId} ${old.inputName}, available: ${this.sources.map(s => `${s.blockId} ${s.inputName}`)}`);
        }
    }

    removeInputSource(source: InputSource) {
        const index = this.sources.findIndex((s) => s.blockId === source.blockId && s.inputName === source.inputName);
        if (index !== -1) {
            this.sources.splice(index, 1);
        } else {
            throw new Error(`Source not found: ${source.blockId} ${source.inputName}`);
        }
    }

    onBlockRemove(blockId: string) {
        // remove all dependencies and sources for this block
        this.dependencies = this.dependencies.filter((d) => d.blockId !== blockId);
        this.sources = this.sources.filter((s) => s.blockId !== blockId);
    }

    onInputValueChange(params: InputValueChangeParams) {
        // set the new value for the source
        const source = this.sources.find((s) => s.blockId === params.interactiveId && s.inputName === params.inputName);
        if (source) {
            source.inputValue = params.inputValue;
        } else {
            throw new Error(`Input source not found: ${params.interactiveId} ${params.inputName}`);
        }
        for (const dependency of this.dependencies) {
            if (dependency.inputName === params.inputName) {
                dependency.callFunction(params.inputValue);
            }
        }
    }

    onBlockChangeEvent(events: BlockMutationEvent[]) {
        // check if it is a block-removed event
        for (const event of events) {
            if (event.type === 'block-removed') {
                const blockName = event.detail.target.name;
                if (isInteractiveBlock(blockName)) {
                    let interactiveId
                    let getStringFunction = (id: string) => {
                        interactiveId = id;
                    };
                    event.detail.target.call("getInteractiveId", getStringFunction);
                    // assert if interactiveId is not set
                    if (!interactiveId) {
                        throw new Error("InteractiveId is not set");
                    }

                    this.onBlockRemove(interactiveId);
                }
            }
        }
    }

    getInputValue(inputName: string): InputValue {
        const source = this.sources.find((s) => s.inputName === inputName);
        if (source) {
            return source.inputValue;
        } else {
            throw new Error(`Input source not found: ${inputName}`);
        }
    }

    getAvailableInputs(): Record<string, string> {
        const inputs: Record<string, string> = {};
        for (const source of this.sources) {
            inputs[source.inputName] = source.inputValue.value;
        }
        return inputs;
    }
}
