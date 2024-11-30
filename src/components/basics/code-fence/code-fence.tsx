import React from "react";
import {Sometype_Mono} from "next/font/google";
import {CodeFenceOverlay} from "@/components/basics/code-fence/code-fence-overlay";
import Editor from "@monaco-editor/react";

const fontMono = Sometype_Mono({subsets: ["latin"], weight: "400"});

export type SupportedLanguages = "sql" | "plaintext";

export interface CodeFenceProps {
    language: SupportedLanguages;
    displayCode: string;
    copyCode?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
    readOnly?: boolean;
    onCodeChange?: (code: string) => void;
    height?: string;
    width?: string;
}

export function CodeFence({
                              language,
                              displayCode,
                              copyCode,
                              showLineNumbers = false,
                              showCopyButton = false,
                              readOnly = false,
                              height = "auto",
                              width = "auto",
                          }: CodeFenceProps) {
    copyCode = copyCode || displayCode;


    function onCodeChange(value: string | undefined) {
        if (readOnly) {
            return;
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

    function onMount(editor: any, monaco: any) {
        // add the custom theme
        monaco.editor.defineTheme('customTheme', customTheme);
        monaco.editor.setTheme('customTheme');
    }

    return (
        <div
            style={{fontFamily: fontMono.style.fontFamily, fontSize: "14px"}}
            className="relative rounded-lg py-4 bg-gray-100 dark:bg-gray-800 h-full w-full"
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
                    theme: "customTheme",
                    scrollBeyondLastLine: false,
                    tabSize: 2,
                    scrollbar: {
                        horizontalScrollbarSize: 4,
                        verticalScrollbarSize: 4
                    },
                    renderLineHighlight: "gutter",
                }}
                onChange={onCodeChange}
                onMount={onMount}
            />
            <CodeFenceOverlay showCopyButton={showCopyButton} copyCode={copyCode}/>

        </div>
    );
}


