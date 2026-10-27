import ReactMarkdown, {Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import canvas from "@web/components/docs/canvas.md?raw";
import dashboards from "@web/components/docs/dashboards.md?raw";
import assistant from "@web/components/docs/assistant.md?raw";

export interface Doc {
    slug: string;
    title: string;
    description: string;
    markdown: string;
}

// By their path, in the order of the docs' navigation.
const SOURCES: Record<string, string> = {canvas, dashboards, assistant};
const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

/** The site's docs, from `docs/*.md` with a `title` and `description` in their front matter. */
export function allDocs(): Doc[] {
    return Object.entries(SOURCES).map(([slug, text]) => {
        const front = Object.fromEntries((FRONT_MATTER.exec(text)?.[1] ?? '').split('\n')
            .map(line => line.split(/:\s(.*)/s).slice(0, 2) as [string, string]));
        return {slug, title: front.title ?? slug, description: front.description ?? '', markdown: text.replace(FRONT_MATTER, '')};
    });
}

export function headingId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const heading = (Tag: 'h2' | 'h3') => function Heading({children}: { children?: React.ReactNode }) {
    return <Tag id={headingId(String(children))}>{children}</Tag>;
};

const COMPONENTS: Components = {
    h2: heading('h2'),
    h3: heading('h3'),
    // A video is written as an image: ![What it shows](….mp4).
    img: ({src, alt}) => typeof src === 'string' && src.endsWith('.mp4')
        ? <video src={src} aria-label={alt} autoPlay muted loop playsInline preload="metadata"/>
        : <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''}/>,
};

export function DocContent({markdown}: { markdown: string }) {
    return (
        <div className="site-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>{markdown}</ReactMarkdown>
        </div>
    );
}
