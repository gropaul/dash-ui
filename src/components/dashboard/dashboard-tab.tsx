import {DashboardElementView} from "@/components/dashboard/dashboard-element-view";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {shallow} from "zustand/shallow";
import {useRelationsState} from "@/state/relations.state";
import {DashboardElementDivider} from "@/components/dashboard/dashboard-element-divider";
import {DashboardElementType, getInitialElement} from "@/model/dashboard-state";


export interface DashboardViewProps {
    dashboardId: string;
}

export function DashboardTab(props: DashboardViewProps) {

    const dashboard = useRelationsState((state) => state.getDashboardState(props.dashboardId), shallow);
    const setDashboard = useRelationsState((state) => state.setDashboardState);
    const updateDashboardViewState = useRelationsState((state) => state.updateDashboardViewState);

    async function onAddElementClick(type: DashboardElementType) {
        const currentElements = {...dashboard.elements};
        const newElement = await getInitialElement(type);
        currentElements[newElement.id] = newElement;
        setDashboard(props.dashboardId, {
            ...dashboard,
            elements: currentElements
        });
    }

    function onRenameDisplay(name: string) {
        updateDashboardViewState(props.dashboardId, {
            displayName: name
        });
    }


    return (
        <div className="w-full h-full flex flex-col">
            <ViewHeader title={dashboard.viewState.displayName} onTitleChange={onRenameDisplay} path={[]}/>
            <div className="p-4 pl-1  overflow-auto w-full h-full">
                <div className={'max-w-screen-md mx-auto h-full flex space-y-2 flex-col '}>
                    {Object.values(dashboard.elements).map((element, index) => (
                        <DashboardElementView
                            dashboardId={props.dashboardId}
                            dashboardElement={element}
                            key={index}
                        />
                    ))}
                    <DashboardElementDivider
                        onAddElementClicked={(type) => onAddElementClick(type)}
                    />
                </div>
                <div style={{height: 256}}/>
            </div>
        </div>
    )
}
