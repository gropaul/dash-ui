import React, {useState} from "react";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import {connectionToSpec, DBConnectionSpec, getDefaultSpec} from "@/state/connections/configs";
import {ConnectionsService} from "@/state/connections/connections-service";
import {toast} from "sonner";
import {AboutContent} from "./about-content";
import {ConnectionContent} from "./connection-content";
import {AlertCircle, BookOpen, Database, Info, Share2, Wand2} from "lucide-react";
import {ShareContent} from "@/components/settings/share-content";
import {LanguageModelContent} from "@/components/settings/language-model-content";
import {DocumentationContent} from "@/components/settings/documentation-content";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useIsMobile} from "@/components/provider/responsive-node-provider";
import {cn} from "@/lib/utils";
import {MobileAppBar} from "@/components/layout/mobile-app-bar";

// Define the tab types
export type SettingsTab = 'about' | 'connection' | 'sharing' | 'language-model' | 'documentation';

export interface ForceOpenReason {
    tab: SettingsTab;
    message: string;
    id: string; // Unique identifier for the reason
}

export const NO_CONNECTION_FORCE_OPEN_REASON: ForceOpenReason = {
    tab: 'connection',
    message: 'No database connection available. Please configure a connection.',
    id: 'no-connection'
}

// Interface for tab definition to make it extensible
export interface SettingsTabDefinition {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}

export interface SettingsViewProps {
    open: boolean;
    forceOpenReasons: ForceOpenReason[];
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

export function SettingsDialog(props: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab | undefined>(props.initialTab);
    const [currentSpec, setCurrentSpec] = useState<DBConnectionSpec>(getCurrentSpec());

    // Reset the current spec when the dialog is opened
    React.useEffect(() => {
        if (props.open) {
            setCurrentSpec(getCurrentSpec());
        }
    }, [props.open]);

    // Update the active tab when initialTab prop changes
    React.useEffect(() => {
        setActiveTab(props.initialTab);
    }, [props.initialTab]);

    function onLocalOpenChange(open: boolean) {
        const forceOpen = props.forceOpenReasons.length > 0;
        if (forceOpen) {
            toast.error(`Cannot close settings: ${props.forceOpenReasons.map(reason => reason.message).join(', ')}`);
        }
        if (!open && !forceOpen) {
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
            content: <LanguageModelContent/>
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
        {
            id: 'documentation',
            label: 'Documentation',
            icon: <BookOpen className="h-4 w-4 mr-1 sm:mr-2"/>,
            content: <DocumentationContent/>
        },
    ];

    const isMobile = useIsMobile();
    const dialogClass = isMobile ? "w-full h-full m-0 rounded-none" : "w-full max-w-4xl h-[90vh] max-h-[600px]  sm:h-[600px]";

    return (

        <Dialog open={props.open} onOpenChange={onLocalOpenChange}

        >
            <DialogContent  className={cn("flex p-0 gap-0", dialogClass)}>
                <SettingsContent
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onLocalOpenChange={onLocalOpenChange}
                    {...props}
                />
            </DialogContent>
        </Dialog>

    );
}

export interface SettingsContentProps extends SettingsViewProps {
    tabs: SettingsTabDefinition[];
    activeTab: SettingsTab | undefined;
    setActiveTab: (tab: SettingsTab | undefined) => void;
    onLocalOpenChange: (open: boolean) => void;
}

function SettingsContent(props: SettingsContentProps) {

    const {tabs, activeTab, setActiveTab} = props;

    // On desktop, default to 'about' tab if none is active.
    // On mobile, no active tab means via are in the main menu
    const isMobile = useIsMobile();
    const actualActiveTab = isMobile ? activeTab : (activeTab || 'about');

    if (isMobile) {
        if (!activeTab) {
            return <SettingsSideBar
                activeTab={actualActiveTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                forceOpenReasons={props.forceOpenReasons}
                onLocalOpenChange={props.onLocalOpenChange}
            />
        } else {
            return <div className="flex-1 overflow-y-auto">

                <MobileAppBar
                    onBackButtonClick={() => setActiveTab(undefined)}
                    label={tabs.find(tab => tab.id === activeTab)?.label || ''}
                />
                {tabs.find(tab => tab.id === activeTab)?.content}
            </div>
        }
    } else {
        return <>
            {/* Sidebar */}
            <SettingsSideBar
                activeTab={actualActiveTab}
                setActiveTab={setActiveTab}
                tabs={tabs}
                forceOpenReasons={props.forceOpenReasons}
                onLocalOpenChange={props.onLocalOpenChange}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {tabs.find(tab => tab.id === activeTab)?.content}
            </div>
        </>
    }
}

interface TabForceOpenIconProps {
    forceOpenReasons: ForceOpenReason[];
    tabId: SettingsTab;
}


export function TabForceOpenIcon(props: TabForceOpenIconProps) {
    if (props.forceOpenReasons.length === 0) {
        return null;
    }
    const reasons = props.forceOpenReasons.filter(reason => reason.tab === props.tabId);
    const message = reasons.map(reason => reason.message).join(', ');


    if (reasons.length > 0) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <AlertCircle className="pl-2 text-red-500">
                        </AlertCircle>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="max-w-xs">
                            {message}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

        );
    }
    return null;

}

interface SettingsSideBarProps {
    activeTab: SettingsTab | undefined;
    setActiveTab: (tab: SettingsTab) => void;
    tabs: SettingsTabDefinition[];
    forceOpenReasons: ForceOpenReason[];
    onLocalOpenChange: (open: boolean) => void;
}

export function SettingsSideBar(props: SettingsSideBarProps) {
    const {setActiveTab, tabs, activeTab} = props;
    const isMobile = useIsMobile();

    const wrapperClass = isMobile ?
        'w-full' :
        'w-fit border-r p-4 bg-muted/30 min-w-[180px] max-w-[254px]';

    return <div className={cn(wrapperClass, "")}>
        {
            isMobile ?
                <MobileAppBar
                    onBackButtonClick={() => props.onLocalOpenChange(false)}
                    label={'Settings'}
                />
                :
                <h5 className={cn("text-lg font-bold")}>
                    Settings
                </h5>
        }
        <ul className={cn("space-y-2 pt-2", isMobile ? 'p-4 space-y-4' : '')}>
            {tabs.map((tab) => (
                <li key={tab.id}>
                    <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex gap-2 items-center py-1 hover:bg-muted w-full text-muted-foreground rounded-sm transition-colors ${
                            isMobile ? 'text-primary font-semibold' :
                                activeTab === tab.id
                                    ? 'text-primary font-semibold'
                                    : ''
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <TabForceOpenIcon forceOpenReasons={props.forceOpenReasons} tabId={tab.id}/>
                    </button>
                </li>
            ))}
        </ul>
    </div>
}