import {CopyButton} from "@/components/basics/input/copy-button";

export interface CodeFenceProps {
    displayCode: string;
    copyCode?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
}

export function CodeFence(props: CodeFenceProps) {
    const {displayCode, copyCode, showCopyButton} = props;
    return (
        <div className={"relative w-full bg-muted rounded-md p-4 overflow-auto"}>
            <pre>
                <code className={"language-sql"}
                    style={{
                        display: "block",
                        padding: "0",
                        margin: "0",
                        lineHeight: "1.5",
                        fontSize: "0.75rem",
                }}
                >
                    {displayCode}
                </code>
            </pre>
            {showCopyButton &&
                <div className={"absolute top-2 right-2"}>
                    <CopyButton textToCopy={copyCode || displayCode}/>
                </div>
            }
        </div>
    );
}