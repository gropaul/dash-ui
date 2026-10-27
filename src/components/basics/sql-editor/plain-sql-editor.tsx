'use client';

import {ReactNode, useRef, useState} from "react";
import {SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS} from "@/platform/global-data";
import "./plain-sql-editor.css";

// Comments, strings, quoted names, numbers, function names (a word before a parenthesis) and other words.
const TOKEN = /(--[^\n]*)|('(?:[^']|'')*'?)|("(?:[^"]|"")*"?)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*(?=\s*\())|(\b[A-Za-z_]\w*\b)/g;
const KEYWORDS = new Set(('select from where group by order asc desc limit offset as and or not in is null join left right '
    + 'inner outer full cross on using having distinct all union intersect except with case when then else end like ilike '
    + 'between exists true false over partition window qualify pivot unpivot create view table replace insert into values')
    .split(' '));

/** `sql` with its keywords, functions, strings, numbers and comments in the editor's colors. */
function highlight(sql: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const match of sql.matchAll(TOKEN)) {
        const [text, comment, string, quoted, number, fn, word] = match;
        const kind = comment ? 'comment' : string ? 'string' : quoted ? 'quoted' : number ? 'number' : fn ? 'function'
            : word && KEYWORDS.has(word.toLowerCase()) ? 'keyword' : undefined;
        if (!kind) continue;
        parts.push(sql.slice(last, match.index), <span key={match.index} className={`sql-${kind}`}>{text}</span>);
        last = match.index! + text.length;
    }
    parts.push(sql.slice(last));
    return parts;
}

/**
 * SQL in a plain text area, in place of the Monaco editor where loading Monaco isn't worth it (the website's
 * canvas). The text area's own text is transparent over a highlighted copy. Changes go out after a short pause, as
 * from the full editor; Cmd/Ctrl+Enter runs the text as it stands.
 */
export function PlainSqlEditor({code, onCodeChange, onRun}: {
    code: string,
    onCodeChange?: (code: string) => void,
    onRun?: (code: string) => void,
}) {
    const [text, setText] = useState(code);
    const [typed, setTyped] = useState(code);
    const [seen, setSeen] = useState(code);
    // Take only changes that didn't come from here, or they race the keystrokes typed meanwhile.
    if (code !== seen) {
        setSeen(code);
        if (code !== typed) setText(code);
    }
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const copy = useRef<HTMLPreElement>(null);

    return (
        <div className="plain-sql-editor relative h-full w-full">
            {/* The trailing space keeps a last empty line as tall as in the text area. */}
            <pre ref={copy} aria-hidden>{highlight(text)} </pre>
            <textarea
                value={text}
                spellCheck={false}
                aria-label="SQL"
                data-plain-sql-editor
                onScroll={e => copy.current?.scrollTo(e.currentTarget.scrollLeft, e.currentTarget.scrollTop)}
                onChange={e => {
                    const value = e.target.value;
                    setText(value);
                    setTyped(value);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => onCodeChange?.(value), SQL_EDITOR_CODE_CHANGE_DEBOUNCE_MS);
                }}
                onKeyDown={e => {
                    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
                    e.preventDefault();
                    clearTimeout(timer.current);
                    onCodeChange?.(text);
                    onRun?.(text);
                }}
            />
        </div>
    );
}
