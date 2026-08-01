import type {ComponentType} from "react";
import type {RelationViewProps} from "@/components/relation/relation-view";

/**
 * Props every config tab receives. Same shape as the relation view props, so a tab can read the
 * full relation state and use the end-user actions to mutate it.
 */
export type RelationConfigTabProps = RelationViewProps;

export type RelationConfigTabId = 'view' | 'parameters' | 'references';

/**
 * One tab in the relation settings side panel. The panel is generated from the registry in
 * `relation-config-tabs.ts` - to add a tab, write a component and add an entry there.
 */
export interface RelationConfigTab {
    id: RelationConfigTabId;
    /** Segmented-control label. Keep it short - the panel can be dragged down to ~200px. */
    label: string;
    component: ComponentType<RelationConfigTabProps>;
    /**
     * Hides the tab when it can never apply to this relation. Omit for tabs that are always
     * shown. A tab that applies but has nothing to display should render an empty state itself
     * rather than disappear, so the panel does not reflow while the user edits the SQL.
     */
    isAvailable?: (props: RelationConfigTabProps) => boolean;
}
