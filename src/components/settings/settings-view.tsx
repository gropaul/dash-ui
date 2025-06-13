import React, {useState} from "react";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import {Avatar, AvatarImage} from "@/components/ui/avatar";
import {connectionToSpec, DBConnectionSpec, getDefaultSpec} from "@/state/connections-database/configs";
import {ConnectionsService} from "@/state/connections-service";
import {toast} from "sonner";
import {AboutContent} from "./about-content";
import {ConnectionContent} from "./connection-content";
import {Database, Info, Share2, MessageSquare, Wand2} from "lucide-react";
import {ShareContent} from "@/components/settings/share-content";
import {LanguageModelContent} from "@/components/settings/language-model-content";

// Define the tab types
export type SettingsTab = 'about' | 'connection' | 'sharing' | 'language-model';

// Interface for tab definition to make it extensible
export interface SettingsTabDefinition {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}

export interface SettingsViewProps {
    open: boolean;
    forceOpen?: boolean;
    onOpenChange: (open: boolean) => void;
    onSpecSave?: (spec: DBConnectionSpec) => void;
    initialTab?: SettingsTab;
}

export function getCurrentSpec(): DBConnectionSpec {
    if (ConnectionsService.getInstance().hasDatabaseConnection()) {
        const connection = ConnectionsService.getInstance().getDatabaseConnection();
        return connectionToSpec(connection);
    } else {
        return getDefaultSpec();
    }
}

export function SettingsView(props: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>(props.initialTab || 'about');
    const [currentSpec, setCurrentSpec] = useState<DBConnectionSpec>(getCurrentSpec());

    // Reset the current spec when the dialog is opened
    React.useEffect(() => {
        if (props.open) {
            setCurrentSpec(getCurrentSpec());
        }
    }, [props.open]);

    // Update active tab when initialTab prop changes
    React.useEffect(() => {
        if (props.initialTab) {
            setActiveTab(props.initialTab);
        }
    }, [props.initialTab]);

    function onLocalOpenChange(open: boolean) {
        if (props.forceOpen) {
            toast.error('You have to configure a connection before you can continue');
        }
        if (!open && !props.forceOpen) {
            props.onOpenChange(open);
        }
    }

    // Define the tabs - this makes it easy to add new tabs in the future
    const tabs: SettingsTabDefinition[] = [

        {
            id: 'connection',
            label: 'Connections',
            icon: <Database className="h-4 w-4 mr-1 sm:mr-2"/>,
            content: <ConnectionContent
                currentSpec={currentSpec}
                onSpecChange={setCurrentSpec}
                onSpecSave={props.onSpecSave}
            />
        },
        {
            id: 'language-model',
            label: 'Assistant',
            icon: <Wand2 className="h-4 w-4 mr-1 sm:mr-2"/>,
            content: <LanguageModelContent />
        },
        {
            id: 'sharing',
            label: 'Sharing',
            icon: <Share2 className="h-4 w-4 mr-1 sm:mr-2"/>,
            content: <ShareContent/>
        },
        {
            id: 'about',
            label: 'About',
            icon: <Info className="h-4 w-4 mr-1 sm:mr-2"/>,
            content: <AboutContent/>
        },
    ];

    return (
        <Dialog open={props.open} onOpenChange={onLocalOpenChange}>
            <DialogContent className="flex p-0 gap-0 w-full max-w-4xl h-[90vh] max-h-[600px] sm:h-[600px]">
                {/* Sidebar */}
                <div className="w-fit min-w-[160px] max-w-[224px] border-r p-4 bg-muted/30">
                    <h5 className="text-lg font-bold">Settings</h5>
                    <ul className="space-y-2 pt-2">
                        {tabs.map((tab) => (
                            <li key={tab.id}>
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center py-1 hover:bg-muted w-full text-muted-foreground rounded-sm transition-colors ${
                                        activeTab === tab.id
                                            ? 'text-primary font-semibold'
                                            : ''
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {tabs.find(tab => tab.id === activeTab)?.content}
                </div>
            </DialogContent>
        </Dialog>
    );
}
