'use client'

import React, {useRef, useEffect} from "react";
import {EditorButtonOverlay} from "@/components/basics/sql-editor/editor-button-overlay";
import Editor, {Monaco} from "@monaco-editor/react";

import {TaskExecutionState} from "@/model/relation-state";
import {EditorButtonPanel} from "@/components/basics/sql-editor/editor-button-panel";
import {Layout} from "@/model/relation-view-state";
import {useTheme} from "next-themes";

import "@/styles/editor-monaco.css";
import {registerHotkeys} from "@/components/basics/sql-editor/register-hotkeys";
import {registerFormatter} from "@/components/basics/sql-editor/register-formatter";
import {registerInputCompletion} from "@/components/basics/sql-editor/regsiter-input-completion";
import {InputManager} from "@/components/editor/inputs/input-manager";

export type SupportedLanguages = "sql" | "plaintext";

export type ButtonPosition = "panel" | "overlay";

export interface SqlEditorProps {
    embedded: boolean;
    language: SupportedLanguages;
    displayCode: string;
    rounded?: boolean;
    copyCode?: string;
    path?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
    buttonPosition?: ButtonPosition;
    alwaysConsumeMouseWheel?: boolean;
    inputManager?: InputManager;

    executionState?: TaskExecutionState;
    showRunButton?: boolean;
    runText?: string;
    onRun?: () => void;

    showLayoutButton?: boolean;
    currentLayout?: Layout;
    onLayoutChange?: (layout: Layout) => void;

    readOnly?: boolean;
    onCodeChange?: (code: string) => void;
    height?: string;
    width?: string;
}

export function SqlEditor(
    {
        displayCode,
        copyCode,
        onRun,
        onCodeChange,
        embedded = false,
        executionState = {state: 'success'},
        showLineNumbers = false,
        showCopyButton = false,
        showRunButton = false,
        buttonPosition = "overlay",
        runText = "Run",
        readOnly = false,
        height = "auto",
        width = "auto",
        alwaysConsumeMouseWheel = false,
        showLayoutButton = false,
        currentLayout = 'column',
        onLayoutChange,
        inputManager,
        path,
    }: SqlEditorProps) {

    copyCode = copyCode || displayCode;
    const {resolvedTheme} = useTheme();

    const editorTheme = resolvedTheme === "dark" ? "customThemeDark" : "customTheme";

    // Use refs to avoid stale closures in debounced callbacks
    const editorRef = useRef<any>(null);
    const onCodeChangeRef = useRef(onCodeChange);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastExternalCodeRef = useRef(displayCode);

    // Keep the callback ref up to date
    useEffect(() => {
        onCodeChangeRef.current = onCodeChange;
    }, [onCodeChange]);

    // Handle external code changes (e.g., when loading a new query)
    useEffect(() => {
        if (editorRef.current && displayCode !== lastExternalCodeRef.current) {
            const currentValue = editorRef.current.getValue();
            // Only update if the external change is different from current editor content
            if (currentValue !== displayCode) {
                editorRef.current.setValue(displayCode);
                lastExternalCodeRef.current = displayCode;
            }
        }
    }, [displayCode]);

    function onLocalCodeChange(value: string | undefined) {
        if (readOnly) {
            return;
        }

        if (value !== undefined && onCodeChangeRef.current) {
            // Clear any existing debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Debounce the state update by 300ms
            debounceTimerRef.current = setTimeout(() => {
                onCodeChangeRef.current?.(value);
            }, 300);
        }
    }

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // define custom theme to set the background transparent
    const baseTheme: any = {
        inherit: true,
        rules: [
            { token: 'string.sql', foreground: '22863a' }, // Green color for strings
        ],
        colors: {
            'editor.background': '#00000000',
        },
    };

    const customTheme: any = {
        ...baseTheme,
        base: 'vs',
    };

    const customThemeDark: any = {
        ...baseTheme,
        base: 'vs-dark',
        rules: [
            { token: 'string.sql', foreground: '7ec699' }, // Light green color for strings in dark mode
        ],
    };

    function onMount(editor: any, monaco: Monaco) {
        // Store editor reference
        editorRef.current = editor;

        // add the custom theme
        monaco.editor.defineTheme('customTheme', customTheme);
        monaco.editor.defineTheme('customThemeDark', customThemeDark);
        monaco.editor.setTheme(editorTheme);

        registerHotkeys(editor, monaco, onRun);
        registerInputCompletion(editor, monaco, inputManager);
        registerFormatter(monaco);
    }

    return (
        <div className="flex flex-col h-full w-full relative">
            {buttonPosition === "panel" && (
                <EditorButtonPanel
                    embedded={embedded}
                    showLayoutButton={showLayoutButton}
                    currentLayout={currentLayout}
                    onLayoutChange={onLayoutChange}
                    showCopyButton={showCopyButton}
                    copyCode={copyCode}
                    showRunButton={showRunButton}
                    onRun={onRun}
                    runText={runText}
                    executionState={executionState}
                />
            )}


            <Editor
                height={height}
                width={width}
                defaultLanguage={'sql'}
                language={'sql'}
                defaultValue={displayCode}
                path={path}
                options={{
                    readOnly: readOnly,
                    minimap: {enabled: false},
                    lineHeight: 20,
                    lineNumbers: showLineNumbers ? "on" : "off",
                    // get theme from the system
                    theme: editorTheme,
                    padding: {top: 12, bottom: 12},
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    scrollbar: {
                        alwaysConsumeMouseWheel: alwaysConsumeMouseWheel,
                        horizontalScrollbarSize: 4,
                        verticalScrollbarSize: 4
                    },
                    renderLineHighlight: "none",
                }}
                onChange={onLocalCodeChange}
                onMount={onMount}
            />
            {buttonPosition === "overlay" && (
                <EditorButtonOverlay
                    embedded={embedded}
                    showCopyButton={showCopyButton}
                    copyCode={copyCode}
                    showRunButton={showRunButton}
                    onRun={onRun}
                    executionState={executionState}
                    runText={runText}
                />
            )}
        </div>

    );
}
