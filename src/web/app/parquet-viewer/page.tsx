import type {Metadata} from "next";
import {ViewerPage} from "@web/components/data-viewer/viewer-page";

export const metadata: Metadata = {
    title: 'Online Parquet Viewer',
    description: 'Open a Parquet file in your browser and see its schema and rows. DuckDB WASM reads the file in the page; nothing is uploaded.',
    alternates: {canonical: '/parquet-viewer'},
};

export default function ParquetViewerPage() {
    return <ViewerPage path="/parquet-viewer"/>;
}
