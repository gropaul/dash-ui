import {describe, expect, it} from "vitest";
import {isChatBlock, leadingChatBlock} from "@/state/agent/chat-blocks";

describe('isChatBlock', () => {
    it('takes sql fences with a view or input header line, as pages do', () => {
        expect(isChatBlock('sql', '-- view: bar\nSELECT 1')).toBe(true);
        expect(isChatBlock('sql', '-- input: Sales/orders.sql\n-- view: table')).toBe(true);
        expect(isChatBlock('sql', 'SELECT 1')).toBe(false);
        expect(isChatBlock('sql', '-- x: a\nSELECT 1')).toBe(false);
        expect(isChatBlock('python', '-- view: bar\nprint(1)')).toBe(false);
        expect(isChatBlock(undefined, '-- view: bar\nSELECT 1')).toBe(false);
    });
});

describe('leadingChatBlock', () => {
    it('finds a data fence the message starts with, and where the rest begins', () => {
        const message = '```sql\n-- view: bar\nSELECT 1\n```\nText after';
        const lead = leadingChatBlock(message)!;
        expect(lead).toEqual({text: '-- view: bar\nSELECT 1', start: 0, end: message.indexOf('Text')});
        expect(message.slice(lead.end)).toBe('Text after');
    });

    it('skips leading whitespace and a block name on the fence line', () => {
        const message = '\n```sql totals\n-- view: table\nSELECT 1\n```';
        expect(leadingChatBlock(message)).toEqual({text: '-- view: table\nSELECT 1', start: 1, end: message.length});
    });

    it('takes no fence after text, and no fence that only shows code', () => {
        expect(leadingChatBlock('Here:\n```sql\n-- view: bar\nSELECT 1\n```')).toBeUndefined();
        expect(leadingChatBlock('```sql\nSELECT 1\n```\nText')).toBeUndefined();
        expect(leadingChatBlock('```python\n-- view: bar\n```')).toBeUndefined();
    });
});
