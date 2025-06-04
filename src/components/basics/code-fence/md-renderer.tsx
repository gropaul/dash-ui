import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm'

import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Copy, Check } from 'lucide-react';

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
                        <div className="overflow-auto my-4 text-xs">
                            <table className="min-w-full border-collapse border border-gray-300 rounded" {...props} />
                        </div>
                    );
                },
                thead({ node, ...props }: any) {
                    return <thead className="bg-gray-100" {...props} />;
                },
                tbody({ node, ...props }: any) {
                    return <tbody {...props} />;
                },
                tr({ node, ...props }: any) {
                    return <tr className="border-b border-gray-300 hover:bg-gray-50" {...props} />;
                },
                th({ node, ...props }: any) {
                    return <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />;
                },
                td({ node, ...props }: any) {
                    return <td className="border border-gray-300 px-4 py-2" {...props} />;
                },
            }}
        />
    );
}
