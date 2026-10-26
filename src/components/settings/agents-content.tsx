import React, {useEffect, useState} from "react";
import {CheckCircle2, Circle, Loader2} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";
import {useGUIState} from "@/state/gui.state";
import {selectAgent, useAgentChatState} from "@/state/agent/agent-chat.state";
import type {AgentInfo} from "@/types/dash-native";

export function AgentsContent() {
    const enabled = useGUIState((s) => s.agentsEnabled);
    const setEnabled = useGUIState((s) => s.setAgentsEnabled);
    const preferredAgentId = useGUIState((s) => s.preferredAgentId);
    const chatAgentId = useAgentChatState((s) => s.agentId);
    const [agents, setAgents] = useState<AgentInfo[] | undefined>();

    useEffect(() => {
        window.dashNative?.agent.list().then(setAgents, () => setAgents([]));
    }, []);

    const installed = agents?.filter((a) => a.path) ?? [];
    const selected = installed.find((a) => a.id === preferredAgentId)?.id ?? chatAgentId ?? installed[0]?.id;

    function onEnabledChange(value: boolean) {
        setEnabled(value);
        if (!value) useAgentChatState.getState().closeSession();
    }

    return (
        <div className="p-4">
            <h5 className="text-base font-bold">Agents</h5>
            <p className="text-muted-foreground">
                The chat panel runs a coding agent installed on this computer, with your existing login. It reads
                your data and edits the workspace through Dash.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="agents-toggle" className="text-sm">
                    Agent chat
                </Label>
                <Switch id="agents-toggle" checked={enabled} onCheckedChange={onEnabledChange}/>
            </div>

            <div className={cn("mt-4 space-y-2", !enabled && "pointer-events-none opacity-50")}>
                <div className="text-sm font-medium">Agent</div>
                {agents === undefined && <Loader2 className="size-4 animate-spin text-muted-foreground"/>}
                {agents?.map((agent) => (
                    <button
                        key={agent.id}
                        type="button"
                        disabled={!agent.path}
                        onClick={() => selectAgent(agent.id)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                            agent.path ? "hover:bg-muted" : "cursor-default",
                            agent.id === selected && "border-primary",
                        )}
                    >
                        {agent.id === selected
                            ? <CheckCircle2 className="size-4 shrink-0 text-primary"/>
                            : <Circle className={cn("size-4 shrink-0 text-muted-foreground", !agent.path && "opacity-40")}/>}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={cn("text-sm", !agent.path && "text-muted-foreground")}>{agent.label}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">
                                {agent.path ?? `${agent.command} is not on your PATH`}
                            </span>
                        </span>
                        <Badge variant={agent.path ? "secondary" : "outline"} className="shrink-0 font-normal">
                            {agent.path ? "Installed" : "Not found"}
                        </Badge>
                    </button>
                ))}
            </div>
        </div>
    );
}
