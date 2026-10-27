import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {cn} from "@/lib/utils";
import {allDocs, DocContent, headingId} from "@/components/site/docs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return allDocs().map(doc => ({slug: doc.slug}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {slug} = await params;
    const doc = allDocs().find(d => d.slug === slug);
    if (!doc) return {};
    return {title: doc.title, description: doc.description, alternates: {canonical: `/docs/${doc.slug}`}};
}

export default async function DocPage({params}: Props) {
    const {slug} = await params;
    const docs = allDocs();
    const doc = docs.find(d => d.slug === slug);
    if (!doc) notFound();
    const sections = [...doc.markdown.matchAll(/^## (.+)$/gm)].map(match => match[1]);

    return (
        <div className="mx-auto flex max-w-6xl gap-12 px-4">
            <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto py-12 text-sm md:block">
                <nav className="space-y-1">
                    {docs.map(d => (
                        <Link key={d.slug} href={`/docs/${d.slug}`}
                              className={cn("block rounded-md px-3 py-1.5 hover:bg-muted", d.slug === slug && "bg-muted font-medium")}>
                            {d.title}
                        </Link>
                    ))}
                </nav>
                {sections.length > 0 && (
                    <nav className="mt-8 space-y-1 border-l pl-3">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">On this page</div>
                        {sections.map(section => (
                            <a key={section} href={`#${headingId(section)}`} className="block py-0.5 text-muted-foreground hover:text-foreground">{section}</a>
                        ))}
                    </nav>
                )}
            </aside>
            <article className="min-w-0 max-w-3xl flex-1 py-12 md:py-16">
                <DocContent markdown={doc.markdown}/>
            </article>
        </div>
    );
}
