import {RelationViewType} from "@/model/relation-view-state";
import {defaultColorFactory, defaultIconFactory} from "@/components/basics/files/icon-factories";

import {HEADER_HEIGHT} from "@/components/canvas/logic/models";
import {RelationState} from "@/model/relation-state";
import {RelationTitleWithActions} from "@/components/relation/common/relation-title-with-actions";

export interface RelationNodeHeaderProps {
    relationState: RelationState;
    viewType: RelationViewType;
}

export function RelationNodeHeader(props: RelationNodeHeaderProps) {
    const {relationState, viewType} = props;
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
                    relationState={relationState}
                    executionInfoClassName="text-md"
                />
            </div>
        </div>
    );
}
