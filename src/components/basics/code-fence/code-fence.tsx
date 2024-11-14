import React from "react";
import { Sometype_Mono } from "next/font/google";
import {Check, Copy} from "lucide-react";

const fontMono = Sometype_Mono({ subsets: ["latin"], weight: "400" });

export type SupportedLanguages = "sql" | "plaintext";

export interface CodeFenceProps {
    language: SupportedLanguages;
    displayCode: string;
    copyCode?: string;
    showLineNumbers?: boolean;
    showCopyButton?: boolean;
}

export function CodeFence({
                              language,
                              displayCode,
                              copyCode,
                              showLineNumbers = false,
                              showCopyButton = false,
                          }: CodeFenceProps) {


    copyCode = copyCode || displayCode;

    const [copied, setCopied] = React.useState(false);


    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        await navigator.clipboard.writeText(copyCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div
            style={{ fontFamily: fontMono.style.fontFamily, fontSize: "14px" }}
        >
            <pre className="relative rounded-lg bg-gray-100 dark:bg-gray-800 p-4 overflow-x-auto w-ful">
                {showLineNumbers && (
                    <div style={{ display: "inline-block", textAlign: "right", marginRight: "10px", color: "#888" }}>
                        {displayCode.split("\n").map((_, i) => (
                            <span key={i} style={{ display: "block" }}>
                                {i + 1}
                            </span>
                        ))}
                    </div>
                )}
                <div>
                    {displayCode}
                </div>
                {showCopyButton && (
                    <button
                        onClick={handleCopy}
                        className="absolute top-4 right-4"
                    >
                        {copied ?
                            <Check size={16} />
                            :
                            <Copy size={16} />
                        }
                    </button>
                )}
            </pre>
        </div>
    );
}
