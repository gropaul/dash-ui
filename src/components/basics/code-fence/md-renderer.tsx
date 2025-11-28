import React, {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm'

import rehypeKatex from 'rehype-katex';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {Check, Copy} from 'lucide-react';
import {cn} from "@/lib/utils";
import {fontMono} from "@/components/relation/table/table-content";

export interface MarkdownRendererProps {
    markdown: string;
    className?: string;
    codeStyle?: any
}

export function MarkdownRenderer({ markdown, className, codeStyle }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            children={markdown}
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
                p({ node, ...props }: any) {
                    return <p className="my-0.5" {...props} />;
                },
                h1({ node, ...props }: any) {
                    return <h1 className="my-0.5" {...props} />;
                },
                h2({ node, ...props }: any) {
                    return <h2 className="my-0.5" {...props} />;
                },
                h3({ node, ...props }: any) {
                    return <h3 className="my-0.5" {...props} />;
                },
                ul({ node, ...props }: any) {
                    return <ul className="my-1 pl-1" {...props} />;
                },
                ol({ node, ...props }: any) {
                    return <ol className="my-1 pl-1" {...props} />;
                },
                li({ node, ...props }: any) {
                    return <li className="my-1" {...props} />;
                },
                code({ node, inline, className, children, ...props }: any) {
                    const CodeBlock = ({ codeString, language }: { codeString: string, language?: string }) => {
                        const [isCopied, setIsCopied] = useState(false);

                        const copyToClipboard = (text: string) => {
                            navigator.clipboard.writeText(text)
                                .then(() => {
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
                                })
                                .catch(err => {
                                    console.error('Failed to copy text: ', err);
                                });
                        };

                        if (language) {
                            return (
                                <div className="relative group">
                                    <button 
                                        onClick={() => copyToClipboard(codeString)}
                                        className="absolute top-2 right-2  p-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    <SyntaxHighlighter
                                        language={language}
                                        PreTag="div"
                                        customStyle={codeStyle}
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        } else {
                            return (
                                <span className="relative group inline-block">
                                    <code className={'text-xs bg-background px-1 py-0.5 rounded'} {...props}>
                                        {codeString}
                                    </code>
                                </span>
                            );
                        }
                    };

                    const match = /language-(\w+)/.exec(className || '')
                    const codeString = String(children).replace(/\n$/, '');

                    return <CodeBlock 
                        codeString={codeString} 
                        language={match ? match[1] : undefined} 
                        {...props} 
                    />;
                },
                table({ node, ...props }: any) {
                    return (
                        <div className="overflow-auto mt-2 text-[13px] text-muted-foreground">
                            <table className={cn("min-w-full border-collapse rounded-md")} {...props} />
                        </div>
                    );
                },
                thead({ node, ...props }: any) {
                    return <thead className="text-muted-foreground" {...props} />;
                },
                tbody({ node, ...props }: any) {
                    return <tbody className={fontMono.className} {...props} />;
                },
                tr({ node, ...props }: any) {
                    return <tr className=" hover:bg-primary/5 border-b transition-colors" {...props} />;
                },
                th({ node, ...props }: any) {
                    return (
                        <th className="px-2 py-1 text-left font-semibold text-foreground" {...props} />
                    );
                },
                td({ node, ...props }: any) {
                    return <td className="px-2 py-1 text-foreground" {...props} />;
                },

            }}
        />
    );
}
