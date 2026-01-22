import {useMemo, useState} from "react";


import {Handle, Node, NodeProps, NodeResizer, NodeToolbar, Position} from '@xyflow/react';
import {NodeBody} from "@/components/workflow/nodes/base";
import {Column, DataSource} from "@/model/data-source-connection";
import {RelationBlockData} from "@/components/editor/tools/relation.tool";
import {InputManager} from "@/components/editor/inputs/input-manager";
import {getInitialDataElement} from "@/model/dashboard-state";
import {RelationStateView} from "@/components/relation/relation-state-view";
import {Button} from "@/components/ui/button";
import {BarChart3, Table2, Map, Code} from "lucide-react";
import {RelationViewAPIProps} from "@/components/relation/relation-view";
import {createEndUserRelationActions} from "@/state/relations/functions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {RelationViewType} from "@/model/relation-view-state";


type NodeFromProps = {
    tableName?: string;
}

type FromNode = Node<NodeFromProps, 'FromNode'>;

export function getTables(source: Column | DataSource): DataSource[] {
    const tables: DataSource[] = []
    for (const child of source.children || []) {
        tables.push(...getTables(child));
    }

    if (source.type === 'relation') {
        tables.push(source);
    }
    return tables;
}

export function RelationNode(props: NodeProps<FromNode>) {

    const [data, setData] = useState<RelationBlockData>(getInitialDataElement('table'))
    const [manager] = useState(() => new InputManager())

    const actions = useMemo(() => {
        const inputProps: RelationViewAPIProps = {
            relationState: data,
            updateRelation: setData,
            inputManager: manager,
            embedded: true
        }
        return createEndUserRelationActions(inputProps)
    }, [data])
    return (
        <NodeBody type="relationNode" className={''} selected={props.selected} displayName={data.viewState.displayName}>
            <NodeToolbar isVisible={props.selected} position={Position.Left} align={'start'} >
                <div className="flex flex-col space-y-2">
                    <Button
                        variant={'outline'}
                        size={'icon'}
                        className={'h-8 w-8'}
                        onClick={actions.toggleShowCode}
                    >
                        <Code/>
                    </Button>
                    <ViewSwitcher
                        currentView={data.viewState.selectedView}
                        onViewChange={actions.setViewType}
                    />
                </div>
            </NodeToolbar>
            <NodeResizer
                lineClassName={'z-40'}
                isVisible={props.selected}
                minWidth={100}
                minHeight={30}
            />
            <div className={'w-full h-full bg-background relative'}>
                <RelationStateView
                    relationState={data}
                    updateRelation={setData}
                    inputManager={manager}
                />
            </div>
            {
                true && <>
                    <Handle type="source" position={Position.Top} id="a"/>
                    <Handle type="source" position={Position.Right} id="b"/>
                    <Handle type="source" position={Position.Bottom} id="c"/>
                    <Handle type="source" position={Position.Left} id="d"/>
                </>
            }
        </NodeBody>
    );

}


function ViewSwitcher({
                          currentView,
                          onViewChange
                      }: {
    currentView: RelationViewType;
    onViewChange: (view: RelationViewType) => void;
}) {
    const views = [
        { id: 'chart', label: 'Chart', icon: BarChart3 },
        { id: 'table', label: 'Table', icon: Table2 },
        { id: 'map', label: 'Map', icon: Map },
    ] as const;

    const disabledViews = ['map'];

    const CurrentIcon = views.find(v => v.id === currentView)?.icon ?? BarChart3;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <CurrentIcon/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {views.map((view) => {
                    const Icon = view.icon;
                    return (
                        <DropdownMenuItem
                            disabled={disabledViews.includes(view.id)}
                            key={view.id}
                            onClick={() => onViewChange(view.id)}
                            className={currentView === view.id ? 'bg-accent' : ''}
                        >
                            <Icon className="mr-2 h-4 w-4"/>
                            {view.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}