"use client"

import React, {useState} from 'react';
import {RelationViewProps} from "@/components/relation/relation-view";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    DEFAULT_RELATION_CONFIG_TAB,
    getAvailableConfigTabs,
} from "@/components/relation/config/relation-config-tabs";

/** True if the settings side panel has anything to show for this relation. */
export function hasConfigPanel(props: RelationViewProps): boolean {
    return getAvailableConfigTabs(props).length > 0;
}

/**
 * The relation settings side panel: a tab shell over the registry in
 * `config/relation-config-tabs.ts`. The selected tab is per-mount state on purpose - reopening a
 * relation should land on the view settings again.
 */
export function RelationViewConfig(props: RelationViewProps) {
    const tabs = getAvailableConfigTabs(props);
    const fallbackTab = tabs.find(t => t.id === DEFAULT_RELATION_CONFIG_TAB)?.id ?? tabs[0]?.id;
    const [selected, setSelected] = useState<string | undefined>(fallbackTab);

    if (tabs.length === 0) return null;

    // the previously selected tab can disappear when the view type changes
    const active = tabs.some(t => t.id === selected) ? selected : fallbackTab;

    return (
        <div className="h-full min-h-0">
            <Tabs
                value={active}
                onValueChange={setSelected}
                className="flex h-full min-h-0 w-full flex-col bg-background"
            >
                <div className="mx-3 mt-3">
                    <TabsList className="w-full">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id} className="min-w-0 flex-1 px-2 text-xs">
                                <span className="truncate">{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <div className="min-h-0 flex-1">
                    <ScrollArea className="h-full w-full">
                        {tabs.map(tab => (
                            <TabsContent key={tab.id} value={tab.id} className="mx-3 mt-0 py-3">
                                <div className="flex flex-col gap-3">
                                    <tab.component {...props}/>
                                </div>
                            </TabsContent>
                        ))}
                    </ScrollArea>
                </div>
            </Tabs>
        </div>
    );
}
