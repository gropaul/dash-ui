import React, {useEffect, useState} from "react";
import {CheckCircle2, ChevronDown, Circle, Loader2} from "lucide-react";
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import {CopyButton} from "@/components/basics/input/copy-button";
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

    const loadAgents = () => window.dashNative?.agent.list().then(setAgents, () => setAgents([]));
    useEffect(() => {
        loadAgents();
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
                {agents?.map((agent) => agent.path ? (
                    <button
                        key={agent.id}
                        type="button"
                        onClick={() => selectAgent(agent.id)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted",
                            agent.id === selected && "border-primary",
                        )}
                    >
                        {agent.id === selected
                            ? <CheckCircle2 className="size-4 shrink-0 text-primary"/>
                            : <Circle className="size-4 shrink-0 text-muted-foreground"/>}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-sm">{agent.label}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">{agent.path}</span>
                        </span>
                        <Badge variant="secondary" className="shrink-0 font-normal">Installed</Badge>
                    </button>
                ) : (
                    <Collapsible key={agent.id} className="group rounded-md border">
                        <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted">
                            <Circle className="size-4 shrink-0 text-muted-foreground opacity-40"/>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-sm text-muted-foreground">{agent.label}</span>
                                <span className="truncate font-mono text-xs text-muted-foreground">{agent.command} is not on your PATH</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">How to install</span>
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"/>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 border-t p-3">
                            <ol className="space-y-2">
                                {agent.setup.map((step, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="w-4 shrink-0 text-muted-foreground">{i + 1}.</span>
                                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                                            {step.text}
                                            {step.command && (
                                                <span className="flex items-center gap-2 rounded-md bg-muted px-2 py-1">
                                                    <code className="min-w-0 flex-1 truncate font-mono text-xs">{step.command}</code>
                                                    <CopyButton textToCopy={step.command}/>
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                            <Button variant="outline" size="sm" onClick={loadAgents}>Check again</Button>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        </div>
    );
}
