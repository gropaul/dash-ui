import {describe, expect, it} from 'vitest';
import type {CreateElicitationRequest} from '@agentclientprotocol/sdk';
import {collect, toFields} from './elicitation-form';

// Shape claude-agent-acp sends for an AskUserQuestion call.
const askUserQuestion: CreateElicitationRequest = {
    mode: 'form',
    sessionId: 's',
    message: 'Which color do you prefer?',
    requestedSchema: {
        type: 'object',
        properties: {
            question_0: {type: 'string', title: 'Color', oneOf: [{const: 'Red', title: 'Red', description: 'The color red'}, {const: 'Blue', title: 'Blue'}]},
            question_0_custom: {type: 'string', title: 'Other'},
            tags: {type: 'array', title: 'Tags', items: {anyOf: [{const: 'a', title: 'A'}, {const: 'b', title: 'B'}]}},
            count: {type: 'integer', title: 'Count'},
        },
        required: ['count'],
    },
};

describe('elicitation form', () => {
    it('maps the schema to fields', () => {
        const fields = toFields(askUserQuestion);
        expect(fields.map((f) => [f.key, f.type, f.required])).toEqual([
            ['question_0', 'choice', false],
            ['question_0_custom', 'text', false],
            ['tags', 'choice', false],
            ['count', 'integer', true],
        ]);
        const color = fields[0];
        expect(color.type === 'choice' && color.options.map((o) => o.value)).toEqual(['Red', 'Blue']);
        expect(fields[2].type === 'choice' && fields[2].multiple).toBe(true);
    });

    it('drops empty optional fields and converts numbers', () => {
        const fields = toFields(askUserQuestion);
        expect(collect(fields, {question_0: 'Blue', question_0_custom: '', tags: ['a'], count: '3'}))
            .toEqual({content: {question_0: 'Blue', tags: ['a'], count: 3}});
    });

    it('reports missing required and invalid numbers', () => {
        const fields = toFields(askUserQuestion);
        expect(collect(fields, {question_0: '', question_0_custom: '', tags: [], count: ''})).toEqual({errors: {count: 'Required'}});
        expect(collect(fields, {question_0: '', question_0_custom: '', tags: [], count: '1.5'})).toEqual({errors: {count: 'Enter a whole number'}});
    });
});
