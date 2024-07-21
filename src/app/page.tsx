'use client';

import DuckDbProvider from "@/components/duck-db-provider";
import {Tmp} from "@/components/tmp";
import ButtonDropDown from "@/components/input/button-drop-down";
import {ButtonSelect} from "@/components/input/button-select";
import {RelationView} from "@/components/relation-view";
import {getTestRelation} from "@/model/relation";
import {useRelationsState} from "@/state/relations.state";


export default function Home() {

    const relationState = useRelationsState();
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <DuckDbProvider>
                <Tmp/>
                {relationState.relations.length != 0 ?
                    <RelationView relation={relationState.relations[0]}/>
                    :
                    <></>
                }
            </DuckDbProvider>
        </main>
    );
}
