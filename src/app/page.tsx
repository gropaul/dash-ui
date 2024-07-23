'use client';

import DuckDbProvider from "@/components/utils/duck-db-provider";
import {useRelationsState} from "@/state/relations.state";
import TabbedLayout from "@/components/layout/tabbed-layout";


export default function Home() {

    const relationState = useRelationsState();
    return (
        <main className="app h-screen w-screen">
            <DuckDbProvider>

                <TabbedLayout/>
            </DuckDbProvider>
        </main>
    );
}
