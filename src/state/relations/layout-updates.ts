import {Action, Actions, DockLocation, Model} from "flexlayout-react";
import {IJsonTabNode} from "flexlayout-react/declarations/model/IJsonModel";
import {useRelationsState} from "@/state/relations.state";
import {useGUIState} from "@/state/gui.state";
import {
    GetEntityDisplayName,
    RelationZustandEntity,
    RelationZustandEntityType
} from "@/state/relations/entity-functions";

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

type Components = 'RelationComponent' | 'DatabaseComponent' | 'DashboardComponent' | 'WorkflowComponent' | 'SchemaComponent';

const RELATION_COMPONENT_MAP: Record<RelationZustandEntityType, Components> = {
    'relations': 'RelationComponent',
    'schemas': 'SchemaComponent',
    'databases': 'DatabaseComponent',
    'dashboards': 'DashboardComponent',
    'workflows': 'WorkflowComponent',
}

const RELATION_ID_NAME: Record<RelationZustandEntityType, string> = {
    'relations': 'relationId',
    'schemas': 'schemaId',
    'databases': 'databaseId',
    'dashboards': 'dashboardId',
    'workflows': 'workflowId',
}

export function addEntityToLayout(model: Model, entityType: RelationZustandEntityType, entity: RelationZustandEntity): string {

    const component = RELATION_COMPONENT_MAP[entityType];
    const displayName = GetEntityDisplayName(entity);
    const nodeId = entity.id
    const nodeName = displayName || 'Unnamed Entity';

    const idKey = RELATION_ID_NAME[entityType];

    addNodeToLayout(model, nodeId, nodeName, component, { [idKey]: nodeId });

    return nodeId;
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