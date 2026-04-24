import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {Lock, LockOpen, Shield, ShieldAlert} from "lucide-react";
import {ModelDownloadBanner} from "@/components/chat/model-download-banner";
import {ChatMessagePart} from "@/components/chat/view-chat/chat-message-part";
import React, {useCallback, useEffect, useRef} from "react";
import {getProviderRegistry} from "@/components/chat/providers";
import {useLanguageModelState} from "@/state/language-model.state";
import {useChatState} from "@/state/chat.state";
import {ChatWindowProps} from "@/components/chat/chat-wrapper";


export default function ChatMessageList(props: ChatWindowProps) {

    const activeProviderId = useLanguageModelState((s) => s.activeProviderId);

    const messages = useChatState((state) => state.getMessages(props.sessionId));

    const isLocalProvider = !!getProviderRegistry().getProvider(activeProviderId)?.prepareModel;
    const isReadOnly = useLanguageModelState((s) => s.isReadOnly());

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const atBottomRef = useRef(true); // ← tracks live "at-bottom" state

    /* ───────────── track user scroll position ───────────── */
    const handleScroll = useCallback(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        const threshold = 16; // px leeway
        atBottomRef.current =
            c.scrollHeight - c.scrollTop - c.clientHeight <= threshold;
    }, []);

    /* ───────────── auto-scroll on new messages ───────────── */
    useEffect(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        if (atBottomRef.current) {
            // small rAF delay keeps it buttery smooth
            requestAnimationFrame(() =>
                c.scrollTo({top: c.scrollHeight, behavior: "smooth"})
            );
        }
    }, [messages]);

    return <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar scroll-smooth"
    >
        <div className="space-y-4 flex flex-col w-full ">
            <div className="text-sm text-center space-y-2">
                <div className="text-muted-foreground">
                    How can I help you today?
                </div>
                <TooltipProvider>
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {isLocalProvider ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground cursor-default">
                                                <Shield className="h-3 w-3"/>&nbsp;Local model
                                            </span>
                                ) : (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 cursor-default">
                                                <ShieldAlert className="h-3 w-3"/>&nbsp;Data shared with provider
                                            </span>
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                {isLocalProvider
                                    ? "Your data stays on your device."
                                    : "Your data will be sent to the 3rd-party model provider."}
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {isReadOnly ? (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground cursor-default">
                                                <Lock className="h-3 w-3"/>&nbsp;Read-only
                                            </span>
                                ) : (
                                    <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 cursor-default">
                                                <LockOpen className="h-3 w-3"/>&nbsp;Full access (read/write/delete)
                                            </span>
                                )}
                            </TooltipTrigger>
                            <TooltipContent>
                                {isReadOnly
                                    ? "No writes or deletes. Change this in settings."
                                    : "The agent can read, write, and delete your data."}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
                <ModelDownloadBanner/>
            </div>
            {messages.map((m, index) => (
                <ChatMessagePart showSystemMessage={props.showSystemMessage} key={index} message={m}/>
            ))}
        </div>
    </div>;
}