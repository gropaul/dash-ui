import React, {useCallback, useEffect, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Lock, LockOpen, Shield, ShieldAlert, X} from "lucide-react";
import {ChatMessagePart} from "./chat-message-part";

import {useChatState} from "@/state/chat.state";
import {ChatWindowProps} from "@/components/chat/chat-wrapper";
import {Alert, AlertTitle} from "@/components/ui/alert";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {ChatInput} from "@/components/chat/view-chat/input/chat-input";
import {ModelDownloadBanner} from "@/components/chat/model-download-banner";
import {useLanguageModelState} from "@/state/language-model.state";
import {getProviderRegistry} from "@/components/chat/providers";
import ChatMessageList from "@/components/chat/view-chat/chat-message-list";


export function ChatViewStateLayout(props: ChatWindowProps) {


    return (
        <div className={`flex flex-col h-full w-full ${props.className}`}>
            {/* Error Alert */}
            {props.error && (
                <div className="flex-none w-full px-3">
                    <Alert variant="destructive">
                        <AlertTitle>
                            <div className="flex items-start justify-between w-full">
                                  <span>
                                    {props.error.toString()} Please check your provider settings.
                                  </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    onClick={props.onHideError}
                                >
                                    <X className="h-3 w-3"/>
                                </Button>
                            </div>
                        </AlertTitle>
                    </Alert>

                </div>
            )}

            <ChatMessageList  {...props} />

            {/* Input Area */}
            <ChatInput
                className={'flex-none'}
                onSendMessage={props.onSendMessage}
                onStop={props.onStop}
                isLoading={props.isLoading ?? false}
            />
        </div>
    );
}
