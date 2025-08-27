import React, {useEffect} from "react";
import {Button} from "@/components/ui/button";
import {AlertCircle, History, Plus, Settings} from "lucide-react";
import {cn} from "@/lib/utils";
import {ChatContentHistory} from "@/components/chat/chat-content-history";
import {ChatContentMessages} from "@/components/chat/chat-content-messages";
import {Badge} from "@/components/ui/badge";
import {useLanguageModelState} from "@/state/language-model.state";
import {useGUIState} from "@/state/gui.state";
import {getProviderRegistry, getValidationStatus, ValidationStatus} from "@/components/chat/providers";


export interface ChatWindowProps {
    className?: string;
    sessionId?: string;
    onSessionSelect: (sessionId?: string) => void;
    onSendMessage: (content: string) => void;
    isLoading?: boolean;
    showSystemMessage?: boolean;
    error?: string;
    onHideError: () => void;
}

export function ChatWrapper(props: ChatWindowProps) {

    const [showHistory, setShowHistory] = React.useState(false);
    const {activeProviderId, providerConfigs} = useLanguageModelState();
    const [currentProviderState, setCurrentProviderState] = React.useState<ValidationStatus>(getValidationStatus('ok'));
    const openSettingsTab = useGUIState(state => state.openSettingsTab);

    // check the provider state if the providerConfigs/activeProviderId is changed
    useEffect(() => {
        const provider = getProviderRegistry().getProvider(activeProviderId);
        if (!provider) {
            console.error(`Provider with ID ${activeProviderId} not found.`);
            return;
        }
        provider.getStatus().then((status) => {
            setCurrentProviderState(status);
        });
    }, [activeProviderId, providerConfigs]);

    // Get provider registry to get display name
    const provider = getProviderRegistry().getProvider(activeProviderId);
    const providerName = provider ? provider.getDisplayName() : 'Unknown';

    function toggleHistory() {
        // if we currently show history, we want to reset the sessionId
        if (showHistory) {
            props.onSessionSelect(undefined);
            setShowHistory(false);
        } else {
            setShowHistory(true);
        }
    }

    function localSessionSelected(sessionId?: string) {
        props.onSessionSelect(sessionId);
        setShowHistory(false);
    }

    function goToSettings() {
        openSettingsTab('language-model');
    }

    const header = showHistory ? "Chat History" : " Chat Assistant";

    return (
        <div
            className={cn(
                "h-full w-full bg-background flex flex-col",
                props.className
            )}
        >
            <div className="flex-none pl-4 pt-2.5 pr-3 pb-2 flex flex-row items-center justify-between">
                <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">
                    <div>
                        {header}
                    </div>
                    <Badge
                        variant="secondary"
                        className="cursor-pointer ml-2"
                        onClick={goToSettings}
                        title={currentProviderState.message}
                    >
                        {providerName}
                        {currentProviderState.status === 'error' && (
                            <AlertCircle
                                size={14}
                                className="inline-block ml-1 text-red-500 cursor-pointer"
                            />
                        )}
                    </Badge>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className={'h-8 w-8'}
                        onClick={toggleHistory}
                    >
                        {!showHistory ? <History size={16}/> : <Plus size={16}/>}
                    </Button>
                    <Button
                        variant={'ghost'}
                        size={'icon'}
                        className={'h-8 w-8'}
                        onClick={goToSettings}
                    >
                        <Settings size={16}/>
                    </Button>

                </div>
            </div>
            <div className={"flex-1 overflow-y-auto"}>
                {showHistory ?
                    <ChatContentHistory {...props} onSessionSelect={localSessionSelected}/>
                    :
                    <ChatContentMessages {...props}/>
                }
            </div>
        </div>
    );
}
