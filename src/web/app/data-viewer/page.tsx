import type {Metadata} from "next";
import {ViewerPage} from "@web/components/data-viewer/viewer-page";

export const metadata: Metadata = {
    title: 'Data Viewer for Parquet and CSV Files',
    description: 'Open a Parquet or CSV file in your browser and see its rows, columns and types. DuckDB WASM reads the file in the page; nothing is uploaded.',
    alternates: {canonical: '/data-viewer'},
};

export default function DataViewerPage() {
    return <ViewerPage path="/data-viewer"/>;
}
