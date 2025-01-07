import { Action, Actions, DockLocation, Model } from "flexlayout-react";
import { Relation } from "@/model/relation";
import { IJsonTabNode } from "flexlayout-react/declarations/model/IJsonModel";
import { useRelationsState } from "@/state/relations.state";
import { RelationState } from "@/model/relation-state";
import { DataSourceGroup } from "@/model/connection";
import { DashboardState } from "@/model/dashboard-state";

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

    if (action.type === "FlexLayout_DeleteTab") {
        state.closeTab(action.data.node);
    }

    return action;
}

// Tab Manipulation
export function focusTabById(model: Model, relationId: string): void {
    model.doAction(Actions.selectTab(relationId));
}

export function addRelationToLayout(model: Model, relation: RelationState): void {
    addNodeToLayout(model, relation.id, relation.name, 'RelationComponent', { relationId: relation.id });
}

export function addDatabaseToLayout(model: Model, databaseId: string, database: DataSourceGroup): void {
    addNodeToLayout(model, databaseId, database.name, 'DatabaseComponent', { databaseId });
}

export function addDashboardToLayout(model: Model, dashboardId: string, dashboard: DashboardState): void {
    addNodeToLayout(model, dashboardId, dashboard.name, 'DashboardComponent', { dashboardId });
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