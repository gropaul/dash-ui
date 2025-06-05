import {LLMChatMessage, LLMTool} from "@/components/chat/model/ollama-service";
import {ConnectionsService} from "@/state/connections-service";
import {SQLTollDescription} from "@/components/chat/model/promts";

function toolStringToMessage(toolString: string): LLMChatMessage {
    return {
        role: 'tool',
        content: toolString,
    };
}

export const AddTwoNumbersTool: LLMTool = {
    call: async (args: { [key: string]: any }): Promise<LLMChatMessage> => {
        const a = args.a;
        const b = args.b;
        if (a === undefined || b === undefined) {
            return toolStringToMessage('Error: Both arguments must be provided.');
        }
        console.log(`Adding numbers: ${a} + ${b}`);
        console.log(`Type of a: ${typeof a}, Type of b: ${typeof b}`);
        if (typeof a !== 'number' || typeof b !== 'number') {
            return toolStringToMessage('Error: Both arguments must be numbers.');
        }
        const result = a + b;
        return toolStringToMessage(`The result of adding ${a} and ${b} is ${result}.`);
    },
    type: 'function',
    function: {
        name: 'addNumbers',
        description: 'Adds two numbers together.',
        parameters: {
            type: 'object',
            properties: {
                a: {
                    type: 'number',
                    description: 'The first number.',
                },
                b: {
                    type: 'number',
                    description: 'The second number.',
                },
            },
            required: ['a', 'b'],
        },
    },
}

export const MultiplyTwoNumbersTool: LLMTool = {
    call: async (args: { [key: string]: any }): Promise<LLMChatMessage> => {
        const a = args.a;
        const b = args.b;
        if (a === undefined || b === undefined) {
            return toolStringToMessage('Error: Both arguments must be provided.');
        }
        console.log(`Multiplying numbers: ${a} * ${b}`);
        console.log(`Type of a: ${typeof a}, Type of b: ${typeof b}`);
        if (typeof a !== 'number' || typeof b !== 'number') {
            return toolStringToMessage('Error: Both arguments must be numbers.');
        }
        const result = a * b;
        return toolStringToMessage(`The result of multiplying ${a} and ${b} is ${result}.`);
    },
    type: 'function',
    function: {
        name: 'multiplyNumbers',
        description: 'Multiplies two numbers together.',
        parameters: {
            type: 'object',
            properties: {
                a: {
                    type: 'number',
                    description: 'The first number.',
                },
                b: {
                    type: 'number',
                    description: 'The second number.',
                },
            },
            required: ['a', 'b'],
        },
    },
}

export const QueryDatabaseTool: LLMTool = {
    call: async (args: { [key: string]: any }): Promise<LLMChatMessage> => {
        const query = args.query;
        if (!query) {
            return toolStringToMessage('Error: Query must be provided.');
        }
        const connection = ConnectionsService.getInstance();
        if (!connection.hasDatabaseConnection()) {
            return toolStringToMessage('Error: No database connection available.');
        }

        const db = connection.getDatabaseConnection();
        try {
            const result = await db.executeQuery(query);
            return toolStringToMessage(`Query executed successfully. Result: ${JSON.stringify(result.rows)}`);
        } catch (error: any) {
            console.error('Error executing query:', error);
            return toolStringToMessage(`Error executing query: ${error.message}`);
        }
    },
    type: 'function',
    function: {
        name: 'queryDatabase',
        description: SQLTollDescription,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The SQL query to execute.',
                },
            },
            required: ['query'],
        },
    },
}
