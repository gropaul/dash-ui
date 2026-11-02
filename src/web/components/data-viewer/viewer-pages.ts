/** The viewer pages by path: the title the site header shows as their h1, and the other viewer their text links to. */
export const VIEWER_PAGES: Record<string, { title: string, also?: { label: string, href: string } }> = {
    '/data-viewer': {
        title: 'Data viewer',
    },
    '/parquet-viewer': {
        title: 'Parquet viewer',
        also: {label: 'CSV files', href: '/csv-viewer'},
    },
    '/csv-viewer': {
        title: 'CSV viewer',
        also: {label: 'Parquet files', href: '/parquet-viewer'},
    },
};
