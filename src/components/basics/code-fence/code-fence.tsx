import React from "react";
import {Sometype_Mono} from "next/font/google";
import {CodeFenceButtonOverlay} from "@/components/basics/code-fence/code-fence-button-overlay";
import Editor from "@monaco-editor/react";
import {TaskExecutionState} from "@/model/relation-state";
import {CodeFenceButtonPanel} from "@/components/basics/code-fence/code-fence-button-panel";
import {Layout} from "@/model/relation-view-state";
import {useTheme} from "next-themes";

const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

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

export function CodeFence(
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

        showLayoutButton = false,
        currentLayout = 'column',
        onLayoutChange,
    }: CodeFenceProps) {

    copyCode = copyCode || displayCode;
    const { resolvedTheme } = useTheme();

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
    const customTheme = {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#00000000',
        },
    };

    const customThemeDark = {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#00000000',
        },
    };

    function onMount(editor: any, monaco: any) {
        // add the custom theme
        monaco.editor.defineTheme('customTheme', customTheme);
        monaco.editor.defineTheme('customThemeDark', customThemeDark);
        monaco.editor.setTheme(editorTheme);
    }

    const roundedStyle = rounded ? "rounded-lg" : "";

    return (
        <div className="flex flex-col h-full w-full">
            {buttonPosition === "panel" && (
                <CodeFenceButtonPanel
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

            <div
                style={{fontFamily: fontMono.style.fontFamily, fontSize: "14px"}}
                className={`relative h-full w-full ${roundedStyle}`}
            >
                <Editor
                    height={height}
                    width={width}
                    language={language}
                    value={displayCode}
                    options={{
                        readOnly: readOnly,
                        minimap: {enabled: false},
                        lineNumbers: showLineNumbers ? "on" : "off",
                        // get theme from the system
                        theme: editorTheme,
                        padding: {top: 12, bottom: 12},
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                        scrollbar: {
                            horizontalScrollbarSize: 4,
                            verticalScrollbarSize: 4
                        },
                        renderLineHighlight: "none",
                    }}
                    onChange={onLocalCodeChange}
                    onMount={onMount}
                />
                {buttonPosition === "overlay" && (
                    <CodeFenceButtonOverlay
                        showCopyButton={showCopyButton}
                        copyCode={copyCode}
                        showRunButton={showRunButton}
                        onRun={onRun}
                        executionState={executionState}
                        runText={runText}
                    />
                )}
            </div>
        </div>

    );
}


