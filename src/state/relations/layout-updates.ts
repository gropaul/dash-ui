import {Action, Actions, DockLocation, Model} from "flexlayout-react";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {useRelationsState} from "@/state/relations.state";
import {RelationState} from "@/model/relation-state";
import {DataSourceGroup} from "@/model/data-source-connection";
import {DashboardState} from "@/model/dashboard-state";
import {useGUIState} from "@/state/gui.state";
import {WorkflowState} from "@/model/workflow-state";

// Layout Initialization
export function getInitialLayoutModel(): Model {
    return Model.fromJson({
        global: {
            splitterSize: 1,
            splitterExtra: 8,
            enableRotateBorderIcons: true,
            enableEdgeDock: false,
            tabIcon: 'relation',
            tabSetTabStripHeight: 41,
        },
        layout: {
            type: 'row',
            children: [
                {
                    type: 'tabset',
                    headerHeight: 100,
                    children: [],
                }
            ],
        }
    });
}

// Layout Change Handling
export function onLayoutModelChange(action: Action): Action | undefined {
    const state = useRelationsState.getState();
    const guiState = useGUIState.getState();

    if (action.type === "FlexLayout_DeleteTab") {
        state.closeTab(action.data.node);
    } else if (action.type === "FlexLayout_SelectTab") {
        guiState.setSelectedTabId(action.data.tabNode);
    } else {
        // trigger persistence of the layout but
        guiState.persistState();
    }
    return action;
}

export function removeTab(model: Model, tabId: string): void {
    model.doAction(Actions.deleteTab(tabId));
}

export function renameTab(model: Model, tabId: string, newName: string): void {
    model.doAction(Actions.renameTab(tabId, newName));
}

// Tab Manipulation
export function focusTab(model: Model, tabId: string): void {
    model.doAction(Actions.selectTab(tabId));
}


export function addRelationToLayout(model: Model, relation: RelationState): void {
    addNodeToLayout(model, relation.id, relation.viewState.displayName, 'RelationComponent', { relationId: relation.id });
}

export function addDatabaseToLayout(model: Model, databaseId: string, database: DataSourceGroup): void {
    addNodeToLayout(model, databaseId, database.name, 'DatabaseComponent', { databaseId });
}

export function addDashboardToLayout(model: Model, dashboard: DashboardState): void {
    const dashboardId = dashboard.id;
    addNodeToLayout(model, dashboardId, dashboard.viewState.displayName, 'DashboardComponent', { dashboardId });
}

export function addWorkflowToLayout(model: Model, workflow: WorkflowState): void {
    addNodeToLayout(model, workflow.id, workflow.viewState.displayName, 'WorkflowComponent', { workflowId:  workflow.id });
}

export function addSchemaToLayout(model: Model, schemaId: string, schema: DataSourceGroup): void {
    addNodeToLayout(model, schemaId, schema.name, 'SchemaComponent', { schemaId });
}

export function addNodeToLayout(
    model: Model,
    nodeId: string,
    nodeName: string,
    component: string,
    config: Record<string, any>
): void {
    const tabSetId = getDefaultTabSetId(model);
    if (!tabSetId) throw new Error("No tabset found");

    const tabNode = createTabNode(nodeId, nodeName, component, config);
    model.doAction(Actions.addNode(tabNode, tabSetId, DockLocation.CENTER, -1));
}

// Utility Functions
function getDefaultTabSetId(model: Model): string | undefined {
    let id: string | undefined;
    model.visitNodes(node => {
        if (!id && node.getType() === 'tabset') {
            id = node.getId();
        }
    });
    if (!id) console.error("No tabset found");
    return id;
}

function createTabNode(id: string, name: string, component: string, config: Record<string, any>): IJsonTabNode {
    return { type: 'tab', enableRename: false, name, id, component, config };
}