import {DashboardState} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";
import {OutputData} from "@editorjs/editorjs";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });


interface DashboardContentProps {
    dashboard: DashboardState;
}

export function DashboardContent(props: DashboardContentProps) {

    const dashboard = props.dashboard;
    const setDashboardState = useRelationsState((state) => state.setDashboardState);

    function onSaved(outputData: OutputData) {
        setDashboardState(dashboard.id, {
            ...dashboard,
            elementState: outputData
        });
    }

    return (
        <div
            className="p-4 pl-1 overflow-auto w-full h-full bg-inherit flex flex-col items-center justify-start"
        >
            <Editor
                id={dashboard.id}
                initialData={dashboard.elementState}
                onSaved={onSaved}
            />
        </div>
    );
}
