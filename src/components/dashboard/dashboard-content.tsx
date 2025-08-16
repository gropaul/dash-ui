import {DashboardState} from "@/model/dashboard-state";
import {useRelationsState} from "@/state/relations.state";
import {OutputData} from "@editorjs/editorjs";

import dynamic from "next/dynamic";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";

const Editor = dynamic(() => import("@/components/editor/editor"), { ssr: false });


interface DashboardContentProps {
    dashboard: DashboardState;
}

export function DashboardContent(props: DashboardContentProps) {

    const dashboard = props.dashboard;
    const setDashboardStateUnsafe = useRelationsState((state) => state.setDashboardStateUnsafe);
    function onSaved(outputData: OutputData) {
        const currentDashboard = useRelationsState.getState().getDashboardState(dashboard.id);
        setDashboardStateUnsafe(dashboard.id, {
            ...currentDashboard,
            elementState: outputData,
        });
    }

    function onBlockChangeEvent(events: BlockMutationEvent[]) {

    }

    return (
        <div
            className="p-4 pl-1 overflow-auto w-full h-full bg-inherit flex flex-col items-center justify-start"
        >
            <Editor
                id={dashboard.id}
                initialData={dashboard.elementState}
                onBlockChangeEvent={onBlockChangeEvent}
                onSaved={onSaved}
            />
        </div>
    );
}
