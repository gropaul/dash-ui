import {InputDependency, InputSource, InputValue} from "@/components/editor/inputs/models";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {isInteractiveBlock} from "@/components/editor/inputs/register-inputs";

export interface InputValueChangeParams {
    blockId: string;
    inputName: string;
    inputValue: InputValue;
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
        console.log("Registering input source: ", source);
        // check if the source already exists
        const index = this.sources.findIndex((s) => s.blockId === source.blockId && s.inputName === source.inputName);
        if (index === -1) {
            this.sources.push(source);
        } else {
            // update the existing source
            this.sources[index] = source;
        }
    }

    updateInputSource(old: InputSource, newSource: InputSource) {
        const index = this.sources.findIndex((s) => s.blockId === old.blockId && s.inputName === old.inputName);
        if (index !== -1) {
            this.sources[index] = newSource;
        } else {
            throw new Error(`Source not found: ${old.blockId} ${old.inputName}, available: ${this.sources.map(s => `${s.blockId} ${s.inputName}`)}`);
        }

        console.log("Updated input source: ", this.sources);
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
        console.log("onInputValueChange", params);
        // set the new value for the source
        const source = this.sources.find((s) => s.blockId === params.blockId && s.inputName === params.inputName);
        if (source) {
            source.inputValue = params.inputValue;
        } else {
            throw new Error(`Input source not found: ${params.blockId} ${params.inputName}`);
        }
        for (const dependency of this.dependencies) {
            if (dependency.inputName === params.inputName) {
                console.log("Calling dependency", dependency);
                dependency.callFunction(params.inputValue);
            }
        }
    }

    onBlockChangeEvent(events: BlockMutationEvent[])  {
        // check if it is a block-removed event
        for (const event of events) {
            if (event.type === 'block-removed') {
                const blockName = event.detail.target.name;
                if (isInteractiveBlock(blockName)){
                    this.onBlockRemove(event.detail.target.id);
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
