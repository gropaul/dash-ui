import {ChatWindowProps} from "@/components/chat/chat-wrapper";
import {useChatState} from "@/state/chat.state";
import {Button} from "@/components/ui/button";
import {Trash} from "lucide-react";


export interface ChatContentHistoryProps extends ChatWindowProps {
}

export function ChatContentHistory(props: ChatContentHistoryProps) {

    const sessions = useChatState(state => state.sessions);
    const deleteSession = useChatState(state => state.deleteSession);

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Prevent session selection when delete button is clicked
        deleteSession(sessionId);
    };

    // Sort sessions by date (newest first)
    const sortedSessions = Object.values(sessions).sort((a, b) => {
        return new Date(b.dateTimeCreated).getTime() - new Date(a.dateTimeCreated).getTime()
    });

    return (
        <div className={'p-4 pt-0 flex flex-col h-full overflow-y-auto'}>

            <div className={'flex flex-col space-y-2'}>
                {sortedSessions.map(session => (
                    <div
                        key={session.id}
                        className={'p-2 bg-secondary rounded cursor-pointer hover:bg-secondary/50 flex justify-between items-center group'}
                        onClick={() => props.onSessionSelect?.(session.id)}
                    >
                        <div className="space-y-1">
                            <div className="text-sm font-medium">{session.name}</div>
                            <div className="text-muted-foreground text-sm flex items-center gap-2">
                                <span>
                                    {new Date(session.dateTimeCreated).toLocaleDateString()}{" "}
                                    {new Date(session.dateTimeCreated).toLocaleTimeString()}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span>{session.messages.length} message{session.messages.length !== 1 ? "s" : ""}</span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteSession(e, session.id)}
                        >
                            <Trash size={16}/>
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
