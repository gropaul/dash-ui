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
    const addDashboardElement = useRelationsState((state) => state.addDashboardElement);

    async function onAddElementClick(type: DashboardElementType) {
        const newElement = await getInitialElement(type);
        addDashboardElement(props.dashboardId, newElement);
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
                <div className={'max-w-screen-md mx-auto h-full flex space-y-2 flex-col mb-[1024px]'}>
                    {/* todo: the resizing only works with h-full but then the bottom padding does not work*/}
                    {Object.values(dashboard.elementsOrder).map((elementId, index) => (
                        <DashboardElementView
                            dashboardId={props.dashboardId}
                            dashboardElement={dashboard.elements[elementId]}
                            key={index}
                            elementIndex={index}
                            elementsCount={dashboard.elementsOrder.length}
                        />
                    ))}
                    <DashboardElementDivider
                        onAddElementClicked={(type) => onAddElementClick(type)}
                    />
                </div>

            </div>
        </div>
    )
}
