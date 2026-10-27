import {ndJsonStream, type Stream} from '@agentclientprotocol/sdk';

export interface AgentStream {
    stream: Stream;
    /** Directory the agent process runs in. */
    cwd: string;
    close: () => void;
}

/** Starts an agent in the Electron main process and wraps its stdio pipe as an ACP stream. */
export async function openAgentStream(agentId: string, onExit: (code: number | string | null) => void): Promise<AgentStream> {
    const api = window.dashNative?.agent;
    if (!api) throw new Error('Agents need the desktop app.');

    const {channelId, cwd} = await api.start(agentId);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const unsubscribers: (() => void)[] = [];

    const readable = new ReadableStream<Uint8Array>({
        start(controller) {
            unsubscribers.push(api.onData(channelId, (chunk) => controller.enqueue(encoder.encode(chunk))));
            unsubscribers.push(api.onExit(channelId, (code) => {
                unsubscribers.forEach((u) => u());
                controller.close();
                onExit(code);
            }));
        },
    });
    const writable = new WritableStream<Uint8Array>({
        write(chunk) {
            api.write(channelId, decoder.decode(chunk, {stream: true}));
        },
    });

    return {
        stream: ndJsonStream(writable, readable),
        cwd,
        close: () => api.close(channelId),
    };
}
