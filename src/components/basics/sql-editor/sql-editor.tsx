'use client'

import React from "react";
import {EditorButtonOverlay} from "@/components/basics/sql-editor/editor-button-overlay";
import Editor, {Monaco} from "@monaco-editor/react";
import {TaskExecutionState} from "@/model/relation-state";
import {EditorButtonPanel} from "@/components/basics/sql-editor/editor-button-panel";
import {Layout} from "@/model/relation-view-state";
import {useTheme} from "next-themes";

import "@/styles/editor-monaco.css";
import {registerHotkeys} from "@/components/basics/sql-editor/register-hotkeys";
import {registerFormatter} from "@/components/basics/sql-editor/register-formatter";

export type SupportedLanguages = "sql" | "plaintext";

export type ButtonPosition = "panel" | "overlay";

export interface CodeFenceProps {
    language: SupportedLanguages;
    displayCode: string;
    rounded?: boolean;
    copyCode?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
    buttonPosition?: ButtonPosition;
    alwaysConsumeMouseWheel?: boolean;

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
        language,
        displayCode,
        copyCode,
        onRun,
        onCodeChange,
        rounded = false,
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
    }: CodeFenceProps) {

    copyCode = copyCode || displayCode;
    const {resolvedTheme} = useTheme();

    const [editor, setEditor] = React.useState<any>(null);
    const editorTheme = resolvedTheme === "dark" ? "customThemeDark" : "customTheme";

    function onLocalCodeChange(value: string | undefined) {
        if (readOnly) {
            return;
        } else if (value) {
            if (onCodeChange) {
                onCodeChange(value);
            }
        }
    }

    // define custom theme to set the background transparent
    const customTheme: any = {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#00000000',
        },
    };

    const customThemeDark: any = {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#00000000',
        },
    };

    function onMount(editor: any, monaco: Monaco) {
        // add the custom theme
        monaco.editor.defineTheme('customTheme', customTheme);
        monaco.editor.defineTheme('customThemeDark', customThemeDark);
        monaco.editor.setTheme(editorTheme);

        registerHotkeys(monaco, onRun);
        registerFormatter(monaco);
        setEditor(editor);
    }

    return (
        <div className="flex flex-col h-full w-full relative">
            {buttonPosition === "panel" && (
                <EditorButtonPanel
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
                language={'sql'}
                value={displayCode}
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


