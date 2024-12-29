'use client';

import {FileDropRelation} from "@/components/import/file-drop-relation";
import {TabbedLayout} from "@/components/layout/tabbed-layout";
import {useTestState} from "@/state/relations.state";


export default function Home() {

    const bears = useTestState(state => state.bears);
    const increas = useTestState(state => state.increase);

    return (
        <FileDropRelation className="h-screen w-screen flex flex-col">
            {/* Add a Toolbar here  and below the Tabbed Laouy*/}
            { true && <div className="h-16 bg-gray-800 text-white flex items-center justify-center w-full">
                <div className="text-2xl">Toolbar {bears}</div>
                <button onClick={() => increas()}>Increase</button>

            </div>}
            <div className="flex-1">
                <TabbedLayout/>
            </div>
        </FileDropRelation>
    );
}
