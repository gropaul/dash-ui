import type {Metadata} from "next";
import {ViewerPage} from "@web/components/data-viewer/viewer-page";

export const metadata: Metadata = {
    title: 'Online CSV Viewer',
    description: 'Open a CSV file in your browser and see its rows and columns with their types. DuckDB WASM reads the file in the page; nothing is uploaded.',
    alternates: {canonical: '/csv-viewer'},
};

export default function CsvViewerPage() {
    return <ViewerPage path="/csv-viewer"/>;
}
