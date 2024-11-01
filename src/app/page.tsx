'use client';

import {FileDropRelation} from "@/components/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";


export default function Home() {
    return (
        <FileDropRelation className="h-screen w-screen">
            {/* Add a Toolbar here  and below the Tabbed Laouy*/}
            <div className="h-16 bg-gray-800 text-white flex items-center justify-center">
                <h1>Toolbar</h1>
            </div>
            <TabbedLayout/>
        </FileDropRelation>
    );
}
