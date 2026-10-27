import {splitHeader} from "@/state/workspace/header-lines";
import {resolveRelative} from "@/state/workspace/paths";
import {isPage} from "@/state/workspace/workspace-tree";

/** Reading a page's markdown as text: its ```sql fences and its links, without the page editor. */

// A fenced block: its opening line, its info string, its body and its closing line.
const FENCE = /^([ \t]*```([^\n]*)\n)([\s\S]*?)(^[ \t]*```[ \t]*$)/gm;
// `[text](url)` or `[text](<url with spaces>)`.
export const LINK = /\[([^\]\n]*)\]\((<[^>\n]*>|[^)\s]*)\)/g;

/** `markdown` with `outside` applied to what lies outside fences and `inSql` to each ```sql fence (its name, its body). */
export function mapPage(
    markdown: string,
    outside: (text: string) => string,
    inSql: (body: string, name: string | undefined) => string,
): string {
    let out = '';
    let last = 0;
    for (const match of markdown.matchAll(FENCE)) {
        out += outside(markdown.slice(last, match.index));
        const [, open, info, body, close] = match;
        const [lang, name] = info.trim().split(/\s+/);
        out += open + (lang === 'sql' ? inSql(body, name) : body) + close;
        last = match.index! + match[0].length;
    }
    return out + outside(markdown.slice(last));
}

/** Each ```sql fence of the page: its name and body. */
export function sqlFences(markdown: string): { name?: string, body: string }[] {
    const fences: { name?: string, body: string }[] = [];
    mapPage(markdown, text => text, (body, name) => {
        fences.push({name, body});
        return body;
    });
    return fences;
}

/** The names of the page's blocks, ```sql <name>, in lower case. */
export function blockNamesOf(markdown: string): Set<string> {
    return new Set(sqlFences(markdown).flatMap(f => f.name ? [f.name.toLowerCase()] : []));
}

/** The paths the page's blocks take in with `-- input:`, resolved from the page. */
export function inputsOf(pagePath: string, markdown: string): string[] {
    return sqlFences(markdown).flatMap(({body}) => {
        const input = splitHeader(body).header.input;
        return input ? resolveRelative(pagePath, input) ?? [] : [];
    });
}

/** A link's path as written: without the `<>` around one with spaces, decoded. */
export function decodeLink(url: string): string {
    const bare = url.startsWith('<') ? url.slice(1, -1) : url;
    try {
        return decodeURI(bare);
    } catch {
        return bare;
    }
}

export const encodeLink = (path: string) => /\s/.test(path) ? `<${path}>` : path;

/** The page a link on the page `from` leads to, if it is a path to a page (not a web address or an anchor). */
export function pageLinkTarget(from: string, url: string): string | undefined {
    const path = decodeLink(url);
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('#') || !isPage(path)) return;
    return resolveRelative(from, path);
}

/** The pages the page links to, resolved from it. */
export function linksOf(pagePath: string, markdown: string): string[] {
    const targets: string[] = [];
    mapPage(markdown, text => {
        for (const [, , url] of text.matchAll(LINK)) {
            const target = pageLinkTarget(pagePath, url);
            if (target) targets.push(target);
        }
        return text;
    }, body => body);
    return targets;
}
