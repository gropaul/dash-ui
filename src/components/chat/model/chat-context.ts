import {useGUIState} from "@/state/gui.state";
import {useRelationsState} from "@/state/relations.state";
import {useMemo, useSyncExternalStore} from "react";

// --- Target Types ---

interface BaseTarget {
    id: string;
    name: string;
    description: string;
}

export interface ChatTarget extends BaseTarget {
    type: 'chat';
}

export interface DashboardTarget extends BaseTarget {
    type: 'dashboard';
}

export interface RelationTarget extends BaseTarget {
    type: 'relation';
    query: string;
    viewType: string;
}

export type Target = ChatTarget | DashboardTarget | RelationTarget;

// --- Enumeration ---

const CHAT_TARGET: ChatTarget = {
    id: 'chat',
    type: 'chat',
    name: 'Chat',
    description: 'Show inline in the chat conversation',
};

export function getAvailableTargets(): Target[] {
    const targets: Target[] = [CHAT_TARGET];

    const layoutModel = useGUIState.getState().layoutModel;
    const relationsState = useRelationsState.getState();

    layoutModel.visitNodes((node) => {
        const nodeId = node.getId();
        console.log(nodeId);
        if (nodeId.startsWith('dashboard-') && false) { // disable dasboards because of read only
            // const dashboard = relationsState.dashboards[nodeId];
            // if (dashboard) {
            //     const blockCount = dashboard.elementState?.blocks?.length ?? 0;
            //     targets.push({
            //         id: nodeId,
            //         type: 'dashboard',
            //         name: dashboard.viewState.displayName ?? dashboard.name,
            //         description: blockCount > 0
            //             ? `Dashboard with ${blockCount} block${blockCount !== 1 ? 's' : ''}`
            //             : 'Empty dashboard',
            //     });
            // }
        } else if (nodeId.startsWith('relation')) {
            const relation = relationsState.relations[nodeId];
            if (relation) {
                const viewType = relation.viewState.selectedView;
                targets.push({
                    id: nodeId,
                    type: 'relation',
                    name: relation.viewState.displayName,
                    query: relation.query.baseQuery,
                    viewType: viewType,
                    description: `Query viewing as ${viewType}`,
                });
            }
        }
    });

    return targets;
}

// --- Prompt Builder ---

export function buildTargetContextPrompt(targets: Target[]): string {
    const lines: string[] = [
        '## Available Targets',
        'You can target your output to any of these destinations using the `target` parameter:',
        '',
        '| target | type | name | details |',
        '|--------|------|------|---------|',
    ];

    for (const target of targets) {
        switch (target.type) {
            case 'chat':
                lines.push(`| "chat" | chat | — | Show inline in the chat conversation |`);
                break;
            case 'dashboard':
                lines.push(`| "${target.id}" | dashboard | ${target.name} | ${target.description} |`);
                break;
            case 'relation':
                const querySmall = target.query.slice(0, 100);
                lines.push(`| "${target.id}" | relation | ${target.name} | ${target.description} — query: ${querySmall} |`);
                break;
        }
    }

    lines.push('');
    lines.push('When the user says "show me", use "chat" as the target.');
    lines.push('When the user references a specific dashboard or relation by name, use its target ID.');
    lines.push('For relation targets, you can use readTarget first to understand the current state, then chart/table tools to update the query.');

    return lines.join('\n');
}

// --- Disabled Targets (external store) ---

let disabledTargets = new Set<string>();
let disabledVersion = 0;
const disabledListeners = new Set<() => void>();

function notifyDisabledListeners() {
    disabledVersion++;
    for (const listener of disabledListeners) listener();
}

export function toggleTargetEnabled(targetId: string) {
    const next = new Set(disabledTargets);
    if (next.has(targetId)) {
        next.delete(targetId);
    } else {
        next.add(targetId);
    }
    disabledTargets = next;
    notifyDisabledListeners();
}

export function isTargetEnabled(targetId: string): boolean {
    return !disabledTargets.has(targetId);
}

export function getEnabledTargets(): Target[] {
    return getAvailableTargets().filter(t => !disabledTargets.has(t.id));
}

function subscribeDisabled(cb: () => void) {
    disabledListeners.add(cb);
    return () => { disabledListeners.delete(cb); };
}

function getDisabledSnapshot() {
    return disabledVersion;
}

function useDisabledTargets(): Set<string> {
    useSyncExternalStore(subscribeDisabled, getDisabledSnapshot);
    return disabledTargets;
}

// --- Reactive Hooks ---

export function useAvailableTargets(): Target[] {
    const layoutModel = useGUIState((s) => s.layoutModel);
    const dashboards = useRelationsState((s) => s.dashboards);
    const relations = useRelationsState((s) => s.relations);

    return useMemo(() => {
        return getAvailableTargets();
    }, [layoutModel, dashboards, relations]);
}

export function useTargetsWithEnabled(): { targets: Target[]; disabled: Set<string> } {
    const targets = useAvailableTargets();
    const disabled = useDisabledTargets();
    return {targets, disabled};
}
