import {DashboardState} from "@/model/dashboard-state";
import {BlockMutationEvent} from "@editorjs/editorjs/types/events/block";
import {BlockAddedEvent, BlockAddedMutationType} from "@editorjs/editorjs/types/events/block/BlockAdded";


export function applyEvents(dashboard: DashboardState, events: BlockMutationEvent[]){
    for (const event of events) {
        switch (event.type) {
            case BlockAddedMutationType:
                applyBlockAddedEvent(dashboard, event as BlockAddedEvent);
                break;
        }
    }
}

export function applyBlockAddedEvent(dashboard: DashboardState, event: BlockAddedEvent) {
    const block = event.detail.target;
    const index = event.detail.index;
}