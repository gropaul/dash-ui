import {useEffect, useState} from "react";
import {useGUIState} from "@/state/gui.state";

// Agents run as local processes through the Electron bridge; without it, or with agents switched off in
// the settings, there is no panel at all. Read after mount so the static prerender and the first client
// render agree.
export function useAgentsAvailable(): boolean {
    const [available, setAvailable] = useState(false);
    const enabled = useGUIState((s) => s.agentsEnabled);
    useEffect(() => setAvailable(window.dashNative?.agent !== undefined), []);
    return available && enabled;
}

export function useAgentPanelShown(): boolean {
    const open = useGUIState((s) => s.agentPanelOpen);
    return useAgentsAvailable() && open;
}
