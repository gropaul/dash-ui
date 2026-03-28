import {useAvailableTargets} from "@/components/chat/model/chat-context";
import {Badge} from "@/components/ui/badge";
import {LayoutDashboard, Table2} from "lucide-react";

export function ChatContextBar() {
    const targets = useAvailableTargets();

    // Filter out the "chat" target — only show real tabs
    const tabTargets = targets.filter(t => t.type !== 'chat');

    if (tabTargets.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 pb-2">
            {tabTargets.map(target => (
                <Badge
                    key={target.id}
                    variant="secondary"
                    className="text-xs gap-1 max-w-[160px]"
                    title={target.description}
                >
                    {target.type === 'dashboard'
                        ? <LayoutDashboard size={10} className="flex-shrink-0"/>
                        : <Table2 size={10} className="flex-shrink-0"/>
                    }
                    <span className="truncate">{target.name}</span>
                </Badge>
            ))}
        </div>
    );
}
