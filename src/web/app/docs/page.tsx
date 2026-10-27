import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {allDocs} from "@web/components/docs";

export const metadata: Metadata = {
    title: 'Docs',
    description: 'How to use Dash: the DuckDB canvas, dashboards written in Markdown, and coding agents working on your project.',
    alternates: {canonical: '/docs'},
};

export default function DocsIndex() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-20">
            <h1 className="text-4xl font-bold tracking-tight">Docs</h1>
            <div className="mt-10 divide-y border-y">
                {allDocs().map(doc => (
                    <Link key={doc.slug} href={`/docs/${doc.slug}`} className="group flex items-start justify-between gap-6 py-6">
                        <div>
                            <h2 className="text-lg font-semibold group-hover:underline">{doc.title}</h2>
                            <p className="mt-1 text-muted-foreground">{doc.description}</p>
                        </div>
                        <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"/>
                    </Link>
                ))}
            </div>
        </div>
    );
}
