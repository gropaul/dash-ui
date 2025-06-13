import React, {useRef, useEffect, useCallback, useState} from "react";
import {Button} from "@/components/ui/button";
import {Database, History, Plus, Send, Settings, Timer} from "lucide-react";
import {cn} from "@/lib/utils";
import {ChatMessageItem} from "./chat-message-item";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Message} from "ai";
import {useChatState} from "@/state/chat.state";
import {ChatContentHistory} from "@/components/chat/chat-content-history";
import {ChatContentMessages} from "@/components/chat/chat-content-messages";
import {Badge} from "@/components/ui/badge";
import {useLanguageModelState} from "@/state/language-model.state";
import {useGUIState} from "@/state/gui.state";


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

export function ChatContentWrapper(props: ChatWindowProps) {

    const [showHistory, setShowHistory] = React.useState(false);
    const {activeProviderId} = useLanguageModelState();
    const openSettingsTab = useGUIState(state => state.openSettingsTab);

    // Get provider registry to get display name
    const providerRegistry = require('@/providers/provider-registry').getProviderRegistry();
    const provider = providerRegistry.getProvider(activeProviderId);
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
            <div className="pl-4 pt-2.5 pr-3 pb-2 flex flex-row items-center justify-between overflow-hidden">
                <div className="text-primary text-nowrap flex flex-row space-x-1 items-center font-bold">
                    <div>
                        {header}
                    </div>
                    <Badge
                        variant="secondary"
                        className="cursor-pointer ml-2"
                        onClick={goToSettings}
                    >
                        {providerName}
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
            {showHistory ?
                <ChatContentHistory {...props} onSessionSelect={localSessionSelected}/>
                :
                <ChatContentMessages {...props}/>
            }
        </div>
    );
}
