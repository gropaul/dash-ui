const HEADER_LINE = /^--\s*([\w-]+):\s*(.*)$/;

/** The leading `-- key: value` lines of a query or fence, and the SQL below them, as written. */
export function splitHeader(text: string): { header: Record<string, string>, sql: string } {
    const lines = text.split('\n');
    const header: Record<string, string> = {};
    let i = 0;
    for (; i < lines.length; i++) {
        const match = HEADER_LINE.exec(lines[i].trim());
        if (!match) break;
        header[match[1]] = match[2].trim();
    }
    return {header, sql: lines.slice(i).join('\n')};
}

export function joinHeader(header: Record<string, string>, sql: string): string {
    const lines = Object.entries(header).map(([key, value]) => `-- ${key}: ${value}`);
    return [...lines, sql].filter(Boolean).join('\n');
}
