'use client'

import React, {useEffect, useId, useRef} from "react";
import {EditorButtonOverlay} from "@/components/basics/sql-editor/editor-button-overlay";
import Editor, {Monaco} from "@monaco-editor/react";

import {TaskExecutionState} from "@/model/relation-state";
import {EditorButtonPanel} from "@/components/basics/sql-editor/editor-button-panel";
import {Layout} from "@/model/relation-view-state";
import {useTheme} from "next-themes";

import "@/styles/editor-monaco.css";
import {registerHotkeys} from "@/components/basics/sql-editor/register-hotkeys";
import {registerFormatter} from "@/components/basics/sql-editor/register-formatter";
import {registerHighlighting} from "@/components/basics/sql-editor/register-highlighting";
import {registerCompletionDuckDB} from "@/components/basics/sql-editor/register-autocomplete";
import {SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS} from "@/platform/global-data";
import {useMonacoState} from "@/state/monaco.state";

export type SupportedLanguages = "sql" | "plaintext";

export type EditorPanelPosition = "panel" | "overlay";

export interface SqlEditorProps {
    embedded: boolean;
    language: SupportedLanguages;
    displayCode: string;
    rounded?: boolean;
    copyCode?: string;
    path?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
    panelMode?: EditorPanelPosition;
    alwaysConsumeMouseWheel?: boolean;

    executionState?: TaskExecutionState;
    showRunButton?: boolean;
    runText?: string;
    onRun?: (code: string) => void;

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
        panelMode = "overlay",
        runText = "Run",
        readOnly = false,
        height = "auto",
        width = "auto",
        alwaysConsumeMouseWheel = false,
        showLayoutButton = false,
        currentLayout = 'column',
        onLayoutChange,
        path,
    }: SqlEditorProps) {

    copyCode = copyCode || displayCode;
    const {resolvedTheme} = useTheme();
    // Always use a unique path per editor instance to avoid model sharing issues
    // when multiple editors exist (e.g., main view + fullscreen dialog)
    const uniqueId = useId();
    const editorPath = `sql-editor-${uniqueId}`;

    const editorTheme = resolvedTheme === "dark" ? "customThemeDark" : "customTheme";

    // Use refs to avoid stale closures in debounced callbacks
    const editorRef = useRef<any>(null);
    // const aiCompletionRef = useRef<ReturnType<typeof registerAiCompletion> | null>(null);
    const onCodeChangeRef = useRef(onCodeChange);
    const onRunRef = useRef(onRun);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastExternalCodeRef = useRef(displayCode);

    // Render Monaco overflow widgets (autocomplete, hover) on document.body so they are
    // outside xyflow's CSS-transformed viewport. Without this, position:fixed widgets
    // are relative to the nearest transformed ancestor (the canvas) instead of the viewport,
    // causing wrong positions at any zoom level other than 1.
    // The container must span the full viewport so Monaco can correctly clamp widget positions.
    const [overflowContainer] = React.useState<HTMLDivElement | null>(() => {
        if (typeof document === 'undefined') return null;
        const el = document.createElement('div');
        el.className = 'monaco-editor';
        el.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:visible;pointer-events:none;z-index:9999;';
        document.body.appendChild(el);
        return el;
    });

    useEffect(() => {
        return () => { overflowContainer?.remove(); };
    }, [overflowContainer]);

    // Keep the callback refs up to date
    useEffect(() => {
        onCodeChangeRef.current = onCodeChange;
    }, [onCodeChange]);

    useEffect(() => {
        onRunRef.current = onRun;
    }, [onRun]);

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

            // Debounce the state update
            debounceTimerRef.current = setTimeout(() => {
                onCodeChangeRef.current?.(value);
            }, SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS);
        }
    }

    function handleRun() {
        const code = editorRef.current?.getValue() ?? displayCode;
        onRunRef.current?.(code);
    }

    // Cleanup debounce timer and AI completion on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            // aiCompletionRef.current?.deregister();
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
        useMonacoState.getState().setMonaco(monaco);

        // add the custom theme
        monaco.editor.defineTheme('customTheme', customTheme);
        monaco.editor.defineTheme('customThemeDark', customThemeDark);
        monaco.editor.setTheme(editorTheme);

        registerHotkeys(editor, monaco, () => handleRun());
        registerFormatter(monaco);

        registerHighlighting(editor, monaco);
        registerCompletionDuckDB(monaco);

        if (!readOnly) {

            // disabled until we have https://huggingface.co/stabilityai/stable-code-3b available in the WebLLM provider,
            // as the completions are currently very low quality and we don't want to set that expectation for users
            // aiCompletionRef.current = registerAiCompletion(editor, monaco);
        }
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-card">
            {panelMode === "panel" && (
                <EditorButtonPanel
                    embedded={embedded}
                    showLayoutButton={showLayoutButton}
                    currentLayout={currentLayout}
                    onLayoutChange={onLayoutChange}
                    showCopyButton={showCopyButton}
                    copyCode={copyCode}
                    showRunButton={showRunButton}
                    onRun={onRun ? handleRun : undefined}
                    runText={runText}
                    executionState={executionState}
                />
            )}


            <Editor
                className={'nodrag'}
                height={height}
                width={width}
                defaultLanguage={'sql'}
                language={'sql'}
                defaultValue={displayCode}
                path={editorPath}
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
                    acceptSuggestionOnEnter: "smart",
                    inlineSuggest: { enabled: true },
                    fixedOverflowWidgets: true,
                    overflowWidgetsDomNode: overflowContainer ?? undefined,

                }}
                onChange={onLocalCodeChange}
                onMount={onMount}
            />
            {panelMode === "overlay" && (
                <EditorButtonOverlay
                    embedded={embedded}
                    showCopyButton={showCopyButton}
                    copyCode={copyCode}
                    showRunButton={showRunButton}
                    onRun={onRun ? handleRun : undefined}
                    executionState={executionState}
                    runText={runText}
                />
            )}
        </div>

    );
}
