'use client';

import {FileDropRelation} from "@/components/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";


export default function Home() {
    return (
        <FileDropRelation>
            <TabbedLayout/>
        </FileDropRelation>
    );
}
