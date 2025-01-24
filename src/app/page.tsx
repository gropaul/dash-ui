'use client';

import {FileDropRelation} from "@/components/import/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";


export default function Home() {
    return (
        <FileDropRelation className="h-screen w-screen flex flex-col">
            <TabbedLayout/>
        </FileDropRelation>
    );
}
