import Link from "next/link";
import {DataViewer} from "@web/components/data-viewer/data-viewer";
import {VIEWER_PAGES} from "@web/components/data-viewer/viewer-pages";
import {BackToViewerLink} from "@web/components/data-viewer/scroll-links";

const STEPS = [
    {title: 'Open a file', body: 'Drop a file or choose one. DuckDB WASM, the DuckDB database compiled to WebAssembly, reads it inside this page: nothing is uploaded, it works offline, and files of hundreds of MB work.'},
    {title: 'See the data', body: 'The rows show as a table. The Columns tab lists them with their types, distinct values, ranges and nulls.'},
    {title: 'Query it', body: 'Edit the SQL to filter, group and sort, or switch the view to a chart.'},
];

const FAQ = [
    {q: 'Is my file uploaded?', a: 'No. DuckDB WASM reads the file in this page, and the file is kept in this browser\'s storage until you delete it.'},
    {q: 'How large can the file be?', a: 'As large as your browser\'s memory and storage allow. Parquet files of several GB work, since only the rows shown are read.'},
    {q: 'Which formats can I open?', a: 'Parquet and CSV, including .tsv. DuckDB detects the delimiter and the column types.'},
    {q: 'Is it free?', a: 'Yes. Dash is open source under the AGPL-3.0 license.'},
];

/**
 * A viewer page at `path`: the viewer filling the window under the site header, which shows the page's title
 * (viewer-pages.ts), then the page's text, below the fold. The header is 3.5rem and its border 1px.
 */
export function ViewerPage({path}: { path: string }) {
    const also = VIEWER_PAGES[path]?.also;
    return (
        <>
            <div className="h-[calc(100dvh-3.5rem-1px)]">
                <DataViewer/>
            </div>

            <div className="border-t">
            <div className="mx-auto max-w-4xl px-4 py-20">
                <section id="how" className="scroll-mt-20">
                    <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
                    {also && (
                        <p className="mt-3 text-muted-foreground">
                            You can also open <Link href={also.href} className="underline underline-offset-2">{also.label}</Link>.
                        </p>
                    )}
                    <ol className="mt-6 grid gap-4 md:grid-cols-3">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="rounded-2xl border bg-card p-5">
                                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                                <h3 className="mt-1.5 font-semibold">{step.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="mt-20">
                    <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
                    <dl className="mt-6 divide-y border-y">
                        {FAQ.map(({q, a}) => (
                            <div key={q} className="py-5">
                                <dt className="font-medium">{q}</dt>
                                <dd className="mt-2 leading-relaxed text-muted-foreground">{a}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <div className="mt-12 flex justify-center">
                    <BackToViewerLink/>
                </div>
            </div>
            </div>
        </>
    );
}
