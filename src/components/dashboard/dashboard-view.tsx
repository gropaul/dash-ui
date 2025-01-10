import {DashboardElementView} from "@/components/dashboard/dashboard-element-view";


export interface DashboardViewProps {
    dashboardId: string;
}

export function DashboardView(props: DashboardViewProps) {

    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);
    const setDashboard = useRelationsState((state) => state.setDashboardState);
    const elementCount = dashboard.elements.length;

    async function onAddElementClick(type: DashboardElementType, index: number) {
        const currentElements = [...dashboard.elements];
        const newElement = await getInitialElement(type);

        currentElements.splice(index, 0, newElement);
        setDashboard(props.dashboardId, {
            ... dashboard,
            elements: currentElements
        });
    }

    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={dashboard.viewState.displayName} path={[]}/>
            {dashboard.elements.map((element, index) => (
                <>
                    <DashboardElementDivider
                        onlyShowOnHover={true}
                        onAddElementClicked={(type) => onAddElementClick(type, index)}
                    />
                    <DashboardElementView dashboardElement={element} key={index}/>
                </>
            ))}
            <DashboardElementDivider
                onAddElementClicked={(type) => onAddElementClick(type, elementCount)}
            />
        </div>
    )
}


import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DatabaseSchemaView} from "@/components/database/database-schema-view";
import {DataSourceGroup} from "@/model/connection";
import {GetPathOfDatabase} from "@/model/database-state";
import {DashboardElementDivider} from "@/components/dashboard/dashboard-element-divider";
import {DashboardElementType, getInitialElement} from "@/model/dashboard-state";

interface DatabaseViewProps {
    databaseId: string;
}

