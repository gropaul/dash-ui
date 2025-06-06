import {ConnectionsService} from "@/state/connections-service";
import {SQLTollDescription} from "@/components/chat/model/promts";
import {EditorsService} from "@/state/editor.state";
import {useGUIState} from "@/state/gui.state";
import {RELATION_BLOCK_NAME, RelationBlockData} from "@/components/editor/tools/relation.tool";
import {getRandomId} from "@/platform/id-utils";
import {Relation, RelationDataToMarkdown, RelationSourceQuery} from "@/model/relation";
import {
    executeQueryOfRelationState,
    getInitialParams,
    getQueryFromParamsUnchecked,
    RelationState
} from "@/model/relation-state";
import {DATABASE_CONNECTION_ID_DUCKDB_LOCAL} from "@/platform/global-data";
import {getInitViewState} from "@/model/relation-view-state";
import {ChartViewState, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import {LLMChatMessage, LLMTool, LLMToolCall} from "@/components/chat/model/llm-service.model";
import {VercelTool} from "@/components/chat/model/llm-service-vercelai";
import {tool} from "ai";
import {z} from "zod";



function toolStringToMessage(toolMessage: string, call: LLMToolCall): LLMChatMessage {
    return {
        role: 'tool',
        toolResults: [
            {
                call_id: call.id,
                name: call.name,
                message: toolMessage,
            }
        ],
    };
}

export const QueryDatabaseTool: LLMTool = {
    call: async (call: LLMToolCall): Promise<LLMChatMessage> => {
        const args = call.arguments;
        const query = args.query;
        if (!query) {
            return toolStringToMessage('Error: Query must be provided.', call);
        }
        const connection = ConnectionsService.getInstance();
        if (!connection.hasDatabaseConnection()) {
            return toolStringToMessage('Error: No database connection available.', call);
        }

        const db = connection.getDatabaseConnection();
        try {
            const result = await db.executeQuery(query);
            const mdResult = RelationDataToMarkdown(result)
            const messageContent = `Query executed successfully. Here are the results:\n\n${mdResult}`;
            return toolStringToMessage(messageContent, call);
        } catch (error: any) {
            console.error('Error executing query:', error);
            return toolStringToMessage(`Error executing query: ${error.message}`, call);
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

interface AddChartToDashboardArgs {
    title?: string;
    sql: string;
    chartType: 'bar' | 'line' | 'pie';
    xAxis: string;
    xLabelRotation?: number;
    yAxes: string[];
    yRangeMin?: 'min' | 'zero';
}

export async function getRelationBlockData(args: AddChartToDashboardArgs): Promise<RelationBlockData> {

    const randomId = getRandomId();
    const baseQuery = args.sql;
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: baseQuery,
        id: randomId,
        name: "New Query"
    }
    const defaultQueryParams = getInitialParams();
    const relation: Relation = {
        connectionId: DATABASE_CONNECTION_ID_DUCKDB_LOCAL, id: randomId, name: "New Query", source: source
    }
    const query = getQueryFromParamsUnchecked(relation, defaultQueryParams, baseQuery)
    const initalViewState = getInitViewState(
        'New Data Element',
        undefined,
        [],
        false
    );
    const relationState: RelationState = {
        ...relation,
        query: query,
        viewState: {
            ...initalViewState,
            chartState: getChartViewState(args),
            selectedView: 'chart',
        },
        executionState: {
            state: "not-started"
        }
    };

    const executedRelationState = await executeQueryOfRelationState(relationState);

    return {
        ...executedRelationState,
    };

}

export function getChartViewState(args: AddChartToDashboardArgs): ChartViewState {

    function dequoteAxisLabel(label: string): string {
        return label.replace(/"/g, '');
    }

    return {
        chart: {
            plot: {
                title: args.title,
                type: args.chartType,
                cartesian: {
                    xLabelRotation: args.xLabelRotation,
                    xAxis: {
                        label: dequoteAxisLabel(args.xAxis),
                        columnId: dequoteAxisLabel(args.xAxis),
                        decoration: getInitialAxisDecoration(0)
                    },
                    yAxes: args.yAxes.map((yAxis, index) => ({
                        label: dequoteAxisLabel(yAxis),
                        columnId: dequoteAxisLabel(yAxis),
                        decoration: getInitialAxisDecoration(index)
                    })),
                    xRange: {

                    },
                    yRange: {
                        start: args.yRangeMin === 'zero' ? 0 : undefined,
                    },
                    decoration: {
                        bar: {
                            stacked: false
                        }
                    },
                    groupBy: undefined
                },
                pie: {
                    axis: {
                        label: {
                            label: dequoteAxisLabel(args.xAxis),
                            columnId: dequoteAxisLabel(args.xAxis),
                            decoration: getInitialAxisDecoration(0)
                        },
                        radius: {
                            label: dequoteAxisLabel(args.yAxes[0]),
                            columnId: dequoteAxisLabel(args.yAxes[0]),
                            decoration: getInitialAxisDecoration(0)
                        }
                    }
                }
            }
        },
        view: {
            showConfig: false,
            configPlotRatio: 0.5,
            layout: 'column',
        }
    }
}


export const AddChartToDashboard: LLMTool = {
    call: async (call: LLMToolCall): Promise<LLMChatMessage> => {
        const args: any = call.arguments;
        const guiState = useGUIState.getState();
        const selectedTabId = guiState.selectedTabId;
        if (!selectedTabId) {
            return toolStringToMessage('Error: No active tab found. The user must open a tab to add the chart.', call);
        } else {
            // try to parse the arguments
            const sql = args.sql;
            const chartType = args.chartType;
            const xAxis = args.xAxis;
            const yAxes = args.yAxes;
            if (!sql) {
                return toolStringToMessage('Error: SQL query must be provided.', call);
            }
            if (!chartType || !['bar', 'line', 'pie'].includes(chartType)) {
                return toolStringToMessage('Error: Invalid chart type. Must be one of: bar, line, pie.', call);
            }
            if (!xAxis) {
                return toolStringToMessage('Error: xAxis must be provided.', call);
            }
            if (!Array.isArray(yAxes) || yAxes.length === 0) {
                return toolStringToMessage('Error: yAxes must be a non-empty array.', call);
            }

            // if pie chart, yAxes must be a single element
            if (chartType === 'pie' && yAxes.length !== 1) {
                return toolStringToMessage('Error: For pie charts, yAxes must contain exactly one element.', call);
            }

            // Check if the yRangeMin is provided and valid
            const yRangeMin = args.yRangeMin;
            if (yRangeMin && !['min', 'zero'].includes(yRangeMin)) {
                return toolStringToMessage('Error: yRangeMin must be either "min" or "zero".', call);
            }

            // check for the title, but it is not required
            const title = args.title;
            if (title && typeof title !== 'string') {
                return toolStringToMessage('Error: title must be a string if provided.', call);
            }
            
            const xLabelRotation = args.xLabelRotation;
            if (xLabelRotation && (typeof xLabelRotation !== 'number')) {
                return toolStringToMessage('Error: xLabelRotation must be a number if provided.', call);
            }

            const hasEditor = EditorsService.getInstance().hasEditor(selectedTabId);
            if (!hasEditor) {
                return toolStringToMessage('Error: No editor found for the active tab. The user must open a tab to add the chart.', call);
            }

            const editor = EditorsService.getInstance().getEditor(selectedTabId);

            const DEFAULT_CONFIG: any = {
                placeholder: "Add a new relation",
                getInputManager: (blockName: string) => {
                    return null; // no input manager for this block
                }
            }

            const data = await getRelationBlockData({
                title: title,
                sql: sql,
                chartType: chartType,
                xAxis: xAxis,
                xLabelRotation: xLabelRotation,
                yAxes: yAxes,
                yRangeMin: yRangeMin
            });

            // if there is an error in the data, return an error message
            if (data.executionState.state === 'error') {
                const jsonString = JSON.stringify(data.executionState.error, null, 2);
                return toolStringToMessage(`Error executing query: ${jsonString}`, call);
            }

            const currentNumberOfBlocks = editor.editor.blocks.getBlocksCount();
            editor.editor.blocks.insert(RELATION_BLOCK_NAME, data, DEFAULT_CONFIG, currentNumberOfBlocks);

            return toolStringToMessage(`Chart was added successfully to the dashboard.`, call);
        }
    },
    type: 'function',
    function: {
        name: 'addChartToDashboard',
        description: 'Adds an element to the dashboard.',
        parameters: {
            type: 'object',
            properties: {
                sql: {
                    type: 'string',
                    description: 'The SQL query to execute for the chart.',
                },
                chartType: {
                    type: 'string',
                    enum: ['bar', 'line', 'pie'],
                    description: 'The type of chart to create.',
                },
                xAxis: {
                    type: 'string',
                    description: 'The column to use for the x-axis.',
                },
                xLabelRotation: {
                    type: 'integer',
                    description: 'Rotation of x-axis labels. For long labels like names, user -30.',
                },
                yRangeMin: {
                    type: 'enum',
                    enum: ['min', 'zero'],
                    description: 'For values like counts etc. that have a reference to zero, use "zero". For other values, use "min".',
                },
                yAxes: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'The columns to use for the y-axes.',
                },
                title: {
                    type: 'string',
                    description: 'The title of the chart.',
                }
            },
            required: ['sql', 'chartType', 'xAxis', 'yAxes', 'xLabelRotation', 'yRangeMin'],
        },
    },
}