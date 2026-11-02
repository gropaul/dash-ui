import {PARAMETERS_SUPPORTED} from "@/platform/global-data";
import {
    RelationConfigTab,
    RelationConfigTabId,
    RelationConfigTabProps,
} from "@/components/relation/config/relation-config-tab";
import {hasViewSettings, ViewSettingsTab} from "@/components/relation/config/tabs/view-settings-tab";
import {ParametersTab} from "@/components/relation/config/tabs/parameters-tab";
import {ReferencesTab} from "@/components/relation/config/tabs/references-tab";
import {SchemaTab} from "@/components/relation/config/tabs/schema-tab";
import {hasReferences} from "@/components/relation/config/use-relation-references";
import {useWorkspace} from "@/state/workspace/workspace.state";

/**
 * The tab registry for the relation settings side panel. The panel shell renders this list, so a
 * new tab is one entry here plus a component - nothing else has to change.
 */
export const RELATION_CONFIG_TABS: RelationConfigTab[] = [
    {
        id: 'view',
        label: 'View',
        component: ViewSettingsTab,
        isAvailable: (props) => hasViewSettings(props.relationState.viewState.selectedView),
    },
    {
        id: 'schema',
        label: 'Columns',
        component: SchemaTab,
    },
    {
        // hidden while {{param}} placeholders are not supported
        id: 'parameters',
        label: 'Parameters',
        component: ParametersTab,
        isAvailable: () => PARAMETERS_SUPPORTED,
    },
    {
        id: 'references',
        label: 'References',
        component: ReferencesTab,
        // Shown once something calls or is called by the query; the panel follows the files (relation-view-config.tsx).
        isAvailable: (props) => hasReferences(useWorkspace.getState().files, props.relationState),
    },
];

export const DEFAULT_RELATION_CONFIG_TAB: RelationConfigTabId = 'view';

export function getAvailableConfigTabs(props: RelationConfigTabProps): RelationConfigTab[] {
    return RELATION_CONFIG_TABS.filter(tab => tab.isAvailable?.(props) ?? true);
}
