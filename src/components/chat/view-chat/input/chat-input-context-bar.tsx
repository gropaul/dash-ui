import {toggleTargetEnabled, useTargetsWithEnabled} from "@/components/chat/model/chat-context";
import {Badge} from "@/components/ui/badge";
import {LayoutDashboard, Table2} from "lucide-react";
import {cn} from "@/lib/utils";

export function ChatInputContextBar() {
    const {targets, disabled} = useTargetsWithEnabled();

    // Filter out the "chat" target — only show real tabs
    const tabTargets = targets.filter(t => t.type !== 'chat');

    // Sort: enabled alphabetically first, then disabled alphabetically
    const sorted = [...tabTargets].sort((a, b) => {
        const aDisabled = disabled.has(a.id);
        const bDisabled = disabled.has(b.id);
        if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
        return a.name.localeCompare(b.name);
    });

    if (sorted.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 pb-2">
            {sorted.map(target => {
                const isDisabled = disabled.has(target.id);
                return (
                    <Badge
                        key={target.id}
                        variant="secondary"
                        className={cn(
                            "text-xs gap-1 max-w-[160px] cursor-pointer select-none transition-opacity",
                            isDisabled && "opacity-30"
                        )}
                        title={target.description}
                        onClick={() => toggleTargetEnabled(target.id)}
                    >
                        {target.type === 'dashboard'
                            ? <LayoutDashboard size={10} className="flex-shrink-0"/>
                            : <Table2 size={10} className="flex-shrink-0"/>
                        }
                        <span className="truncate">{target.name}</span>
                    </Badge>
                );
            })}
        </div>
    );
}
