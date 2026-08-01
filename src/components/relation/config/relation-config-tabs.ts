import {PARAMETERS_SUPPORTED} from "@/platform/global-data";
import {
    RelationConfigTab,
    RelationConfigTabId,
    RelationConfigTabProps,
} from "@/components/relation/config/relation-config-tab";
import {hasViewSettings, ViewSettingsTab} from "@/components/relation/config/tabs/view-settings-tab";
import {ParametersTab} from "@/components/relation/config/tabs/parameters-tab";
import {ReferencesTab} from "@/components/relation/config/tabs/references-tab";

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
    },
];

export const DEFAULT_RELATION_CONFIG_TAB: RelationConfigTabId = 'view';

export function getAvailableConfigTabs(props: RelationConfigTabProps): RelationConfigTab[] {
    return RELATION_CONFIG_TABS.filter(tab => tab.isAvailable?.(props) ?? true);
}
