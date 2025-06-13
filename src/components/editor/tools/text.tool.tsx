// TextSearchBlockTool.tsx
import {createRoot, Root} from 'react-dom/client';
import type {API, BlockTool, BlockToolConstructorOptions} from '@editorjs/editorjs';
import React, {useState, useEffect, ChangeEvent, useRef} from 'react';
import {MenuConfig} from "@editorjs/editorjs/types/tools";
import {
    ICON_SEARCH,
    ICON_SETTING,
} from "@/components/editor/tools/icons";
import {getRandomId} from "@/platform/id-utils";
import {InputSource, InputValue} from "@/components/editor/inputs/models";
import {
    InputManager,
    InputValueChangeParams,
    InteractiveBlock,
    StringReturnFunction
} from "@/components/editor/inputs/input-manager";
import { Input } from "@/components/ui/input";
import { TextConfigDialog } from "./text-config-dialog";
import {Button} from "@/components/ui/button";
import {Settings} from "lucide-react";
import {TEXT_SEARCH_BLOCK_NAME} from "@/components/editor/tool-names";


export interface TextSearchBlockData {
    id: string;
    name: string;
    textSearchState: {
        value?: string;
        name: string;
        showConfig?: boolean;
    };
    codeFenceState: {
        show: boolean;
    };
}

export function getInitialTextSearchData(): TextSearchBlockData {
    const randomId = getRandomId();
    return {
        id: randomId,
        name: "Text INPUT",
        textSearchState: {
            value: "",
            name: "search_" + randomId.substring(0, 8),
            showConfig: false
        },
        codeFenceState: {
            show: false
        }
    };
}

/**
 * React component for text search input
 */
interface TextSearchComponentProps {
    initialData: TextSearchBlockData;
    onDataChange: (data: TextSearchBlockData) => void;
    inputManager: InputManager;
}

function TextSearchComponent(props: TextSearchComponentProps) {
    const {initialData, onDataChange, inputManager} = props;
    const [localData, setLocalData] = useState<TextSearchBlockData>(initialData);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [inputValue, setInputValue] = useState<string>(initialData.textSearchState.value || '');
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Update if the data changes
    useEffect(() => {
        setLocalData(initialData);
        setInputValue(initialData.textSearchState.value || '');
        setIsConfigOpen(initialData.textSearchState.showConfig || false);
    }, [initialData]);

    // Effect to handle debounced search updates
    useEffect(() => {
        // Only update the parent component after debounce period
        if (inputValue !== localData.textSearchState.value) {
            // Clear any existing timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Set a new timer
            debounceTimerRef.current = setTimeout(() => {
                const newData = {
                    ...localData,
                    textSearchState: {
                        ...localData.textSearchState,
                        value: inputValue
                    }
                };
                setLocalData(newData);
                onDataChange(newData);
            }, 300); // 300ms debounce time
        }

        // Cleanup on unmount
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [inputValue, localData, onDataChange]);

    // Handle search input change - only updates local state immediately
    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
    };

    // Handle config dialog open/close
    const handleConfigOpenChange = (open: boolean) => {
        setIsConfigOpen(open);
        const newData = {
            ...localData,
            textSearchState: {
                ...localData.textSearchState,
                showConfig: open
            }
        };
        setLocalData(newData);
        onDataChange(newData);
    };

    // Handle text search state updates from config dialog
    const updateTextSearchState = (state: Partial<{ value?: string; name: string }>) => {
        const newData = {
            ...localData,
            textSearchState: {
                ...localData.textSearchState,
                ...state
            }
        };
        setLocalData(newData);
        onDataChange(newData);
    };

    return (
        <div className="text-search-tool">
            <div className="group pt-0.5 pb-0.5 relative">
                <Input
                    type="text"
                    placeholder="Search..."
                    value={inputValue}
                    onChange={handleSearchChange}
                    className="w-full pr-8"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsConfigOpen(true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 absolute right-1 top-1/2 -translate-y-1/2"
                >
                    <Settings className="h-4 w-4"/>
                </Button>
            </div>

            <TextConfigDialog
                isOpen={isConfigOpen}
                onOpenChange={handleConfigOpenChange}
                textSearchState={localData.textSearchState}
                updateTextSearchState={updateTextSearchState}
            />
        </div>
    );
}

export default class TextSearchBlockTool implements BlockTool, InteractiveBlock {
    private readonly api: API;
    private data: TextSearchBlockData;
    private readOnly: boolean;
    private wrapper: HTMLElement | null = null;
    private reactRoot: Root | null = null;

    private currentSearchValue?: string;
    private currentSearchName: string;
    interactiveId: string;
    private inputManager: InputManager;

    static get isReadOnlySupported() {
        return true;
    }

    // Editor.js config
    static get toolbox() {
        return {
            title: 'Text Input',
            icon: ICON_SEARCH,
        };
    }

    public setShowCodeFence(show: boolean) {
        this.data = {
            ...this.data,
            codeFenceState: {
                ...this.data.codeFenceState,
                show,
            }
        };
        this.render();
    }

    public setShowConfig(show: boolean) {
        this.data = {
            ...this.data,
            textSearchState: {
                ...this.data.textSearchState,
                showConfig: show,
            }
        };
        this.render();
    }

    public static isTextSearchBlockData(data: any): data is TextSearchBlockData {
        return data && typeof data === 'object' && 'textSearchState' in data;
    }

    getInteractiveId(returnFunction: StringReturnFunction): void {
        returnFunction(this.interactiveId);
    }

    constructor({data, api, readOnly, config}: BlockToolConstructorOptions<TextSearchBlockData>) {
        this.api = api;
        this.readOnly = readOnly || false;

        if (TextSearchBlockTool.isTextSearchBlockData(data)) {
            this.data = data;
        } else {
            this.data = getInitialTextSearchData();
        }

        this.currentSearchValue = this.data.textSearchState.value;
        this.currentSearchName = this.data.textSearchState.name;

        // assert if no input manager is passed
        if (!config.getInputManager) {
            throw new Error('GetInputManager function is required');
        }
        this.inputManager = config.getInputManager(TEXT_SEARCH_BLOCK_NAME);
        this.interactiveId = getRandomId(32);

        if (this.inputManager) {
            const inputSource: InputSource = {
                blockId: this.interactiveId,
                inputName: this.data.textSearchState.name,
                inputValue: {
                    value: this.currentSearchValue
                }
            };
            this.inputManager.registerInputSource(inputSource);
        }
    }

    onSearchChanged(value?: string) {
        const params: InputValueChangeParams = {
            interactiveId: this.interactiveId,
            inputName: this.data.textSearchState.name,
            inputValue: {
                value: value
            }
        };
        this.inputManager.onInputValueChange(params);
    }

    onSearchNameChanged(name: string, oldName: string) {
        const oldInputSource = {
            blockId: this.interactiveId,
            inputName: oldName,
            inputValue: {
                value: this.currentSearchValue
            }
        };
        const newInputSource = {
            blockId: this.interactiveId,
            inputName: name,
            inputValue: {
                value: this.currentSearchValue
            }
        };
        this.inputManager.updateInputSource(oldInputSource, newInputSource);
    }

    onDataChange(updatedData: TextSearchBlockData) {
        this.data = updatedData;

        if (this.data.textSearchState.value !== this.currentSearchValue) {
            this.currentSearchValue = this.data.textSearchState.value;
            this.onSearchChanged(this.currentSearchValue);
        }
        if (this.data.textSearchState.name !== this.currentSearchName && this.currentSearchName) {
            const oldName = this.currentSearchName;
            const newName = this.data.textSearchState.name;
            this.onSearchNameChanged(newName, oldName);
            this.currentSearchName = this.data.textSearchState.name;
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
            <TextSearchComponent
                inputManager={this.inputManager}
                initialData={this.data}
                onDataChange={this.onDataChange.bind(this)}
            />
        );

        return this.wrapper;
    }

    public renderSettings(): HTMLElement | MenuConfig {
        const showConfig = this.data.textSearchState.showConfig ?? false;
        const showConfigText = showConfig ? 'Hide Config' : 'Show Config';

        return [
            {
                title: showConfigText,
                closeOnActivate: true,
                icon: ICON_SETTING,
                onActivate: () => {
                    this.setShowConfig(!showConfig);
                }
            }
        ];
    }

    public save(): TextSearchBlockData {
        // Return the final data
        return this.data;
    }

    public destroy() {
        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
    }
}
