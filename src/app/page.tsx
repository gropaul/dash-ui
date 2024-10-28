'use client';

import TabbedLayout from "@/components/layout/tabbed-layout";
import {FileDropRelation} from "@/components/file-drop-relation";


export default function Home() {
    return (
        <FileDropRelation>
            <TabbedLayout/>
        </FileDropRelation>
    );
}
