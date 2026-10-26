// An ACP agent for e2e tests: it answers every prompt with the prompt's own text, so a spec chooses the reply.
import {Readable, Writable} from 'node:stream';
import {AgentSideConnection, ndJsonStream, PROTOCOL_VERSION} from '@agentclientprotocol/sdk';

const stream = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
new AgentSideConnection((connection) => ({
    initialize: () => ({protocolVersion: PROTOCOL_VERSION, agentCapabilities: {}}),
    newSession: () => ({sessionId: 'e2e-session'}),
    authenticate: () => ({}),
    prompt: async ({sessionId, prompt}) => {
        const text = prompt.map((block) => block.type === 'text' ? block.text : '').join('');
        await connection.sessionUpdate({sessionId, update: {sessionUpdate: 'agent_message_chunk', content: {type: 'text', text}}});
        return {stopReason: 'end_turn'};
    },
    cancel: () => undefined,
}), stream);
