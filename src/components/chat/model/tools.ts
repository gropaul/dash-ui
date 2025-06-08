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
import z from 'zod';
import {tool} from "ai";
import {parseMarkdownToBlocks} from "@/components/editor/parse-markdown";


export const QueryDatabaseTool = tool({
    description: SQLTollDescription,
    parameters: z.object({
        query: z.string().describe('The SQL query to execute.'),
    }).describe('Parameters for the SQL query execution.'),
    execute: async ({query}): Promise<string> => {
        if (!query) {
            return 'Error: Query must be provided.';
        }
        const connection = ConnectionsService.getInstance();
        if (!connection.hasDatabaseConnection()) {
            return 'Error: No database connection available.';
        }

        const db = connection.getDatabaseConnection();
        try {
            const result = await db.executeQuery(query);
            const mdResult = RelationDataToMarkdown(result)
            return `Query executed successfully. Here are the results:\n${mdResult}`;
        } catch (error: any) {
            console.error('Error executing query:', error);
            return `Error executing query: ${error.message}`;
        }
    },
});

interface AddedDataViewToTableArgs {
    title?: string;
    sql: string;
    chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
    xAxis: string;
    xLabelRotation?: number;
    yAxes: string[];
    yRangeMin?: 'min' | 'zero';
}

export async function getRelationBlockData(args: AddedDataViewToTableArgs): Promise<RelationBlockData> {

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

export function getChartViewState(args: AddedDataViewToTableArgs): ChartViewState {

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
                    xRange: {},
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

export const AddMarkdownToDashboard = tool({
    description: 'Adds a markdown element to the dashboard.',
    parameters: z.object({
        markdown: z.string().describe('The markdown content to add to the dashboard.')
    }).describe('Parameters for adding markdown to the dashboard.'),
    execute: async ({markdown}) => {
        const guiState = useGUIState.getState();
        const selectedTabId = guiState.selectedTabId;
        if (!selectedTabId) {
            return 'Error: No active tab found. The user must open a tab to add the markdown.';
        } else {
            const hasEditor = EditorsService.getInstance().hasEditor(selectedTabId);
            if (!hasEditor) {
                return 'Error: No editor found for the active tab. The user must open a tab to add the markdown.';
            }

            const editor = EditorsService.getInstance().getEditor(selectedTabId);

            const blocks = parseMarkdownToBlocks(markdown)

            for (const block of blocks) {
                const currentNumberOfBlocks = editor.editor.blocks.getBlocksCount();
                console.log('Adding block to dashboard index:', currentNumberOfBlocks, 'block:', block);
                editor.editor.blocks.insert(block.type, block.data, {}, currentNumberOfBlocks);
            }

            return `Markdown was added successfully to the dashboard.`;
        }
    }
});

export const AddInputToDashboard = tool({
    description: 'Adds an input element to the dashboard. The input can be used in other queries for interactivity. Usage example: `SELECT * FROM table WHERE column = {{input_id}}`.',
    parameters: z.object({
        input_id: z.string().describe('The id of the input element.'),
        inputType: z.enum(['text-select', 'text-field']).describe('Type of the input element: "text-select" for a select input, "text-field" for a text input.'),
    }).describe('Parameters for adding an input to the dashboard.'),
})


export const AddChartToDashboard = tool({

    description: 'Adds an element to the dashboard.',
    parameters: z.object({
        sql: z.string().describe('The SQL query to execute for the chart.'),
        chartType: z.enum(['bar', 'line', 'pie']).describe('The type of chart to create.'),
        xAxis: z.string().describe('The column to use for the x-axis.'),
        xLabelRotation: z.number().optional().describe('Rotation of x-axis labels. For long labels like names, user -30.'),
        yRangeMin: z.enum(['min', 'zero']).optional().describe('For values like counts etc. that have a reference to zero, use "zero". For other values, use "min".'),
        yAxes: z.array(z.string()).describe('The columns to use for the y-axes.'),
        title: z.string().optional().describe('The title of the chart.')
    }).describe('Parameters for adding a chart to the dashboard.'),
    execute: async (args) => {
        const { sql, chartType, xAxis, yAxes, title, xLabelRotation, yRangeMin } = args;
        const guiState = useGUIState.getState();
        const selectedTabId = guiState.selectedTabId;
        if (!selectedTabId) {
            return 'Error: No active tab found. The user must open a tab to add the chart.';
        } else {
            const hasEditor = EditorsService.getInstance().hasEditor(selectedTabId);
            if (!hasEditor) {
                return 'Error: No editor found for the active tab. The user must open a tab to add the chart.';
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
                return `Error executing query: ${jsonString}`;
            }

            const currentNumberOfBlocks = editor.editor.blocks.getBlocksCount();
            console.log('Adding chart to dashboard with data index:', currentNumberOfBlocks, 'data:', data);
            editor.editor.blocks.insert(RELATION_BLOCK_NAME, data, DEFAULT_CONFIG, currentNumberOfBlocks);

            return `Chart was added successfully to the dashboard.`;
        }
    }
});
