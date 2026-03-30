import {RelationViewType} from "@/model/relation-view-state";
import {defaultColorFactory, defaultIconFactory} from "@/components/basics/files/icon-factories";

import {HEADER_HEIGHT} from "@/components/workflow/logic/models";
import {QueryExecutionMetaData, TaskExecutionState} from "@/model/relation-state";
import {RelationTitleWithActions} from "@/components/relation/common/relation-title-with-actions";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";

export interface RelationNodeHeaderProps {
    viewType: RelationViewType;
    displayName: string;
    sql: string;
    parameters?: ParameterDefinition[];
    onUpdateTitle?: (newTitle: string) => void;
    executionState: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
}

export function RelationNodeHeader(props: RelationNodeHeaderProps) {
    const {viewType, displayName, sql, parameters, onUpdateTitle} = props;
    const viewTypeColor = defaultColorFactory(viewType);

    return (
        <div
            className="border-b"
            style={{
                padding: '8px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: `${HEADER_HEIGHT}px`,
            }}
        >
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                background: viewTypeColor.background,
                color: viewTypeColor.foreground
            }}>
                {defaultIconFactory(viewType)}
            </div>
            <div className="flex flex-row min-w-0 gap-1.5 items-center flex-1">
                <RelationTitleWithActions
                    displayName={displayName}
                    sql={sql}
                    parameters={parameters}
                    onUpdateTitle={onUpdateTitle}
                    executionState={props.executionState}
                    lastExecutionMetaData={props.lastExecutionMetaData}
                    executionInfoClassName="text-md"
                />
            </div>
        </div>
    );
}
