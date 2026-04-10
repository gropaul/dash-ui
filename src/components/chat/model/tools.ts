import {ConnectionsService} from "@/state/connections/connections-service";
import {SQLToolDescription} from "@/components/chat/model/promts";
import {EditorsService} from "@/state/editor.state";
import {getRandomId} from "@/platform/id-utils";
import {RelationDataToMarkdown, RelationSourceQuery} from "@/model/relation";
import {executeQueryOfRelation, RelationState} from "@/model/relation-state";
import {RelationViewType} from "@/model/relation-view-state";
import {ChartViewState, getInitialAxisDecoration} from "@/model/relation-view-state/chart";
import z from 'zod';
import {tool} from "ai";
import {parseMarkdownToBlocks} from "@/components/editor/parse-markdown";
import {RelationActions} from "@/state/relations/actions/static-actions";
import {useRelationsState} from "@/state/relations.state";
import {getRelationActions} from "@/state/relations/actions/end-user-actions";
import {getAvailableTargets, isTargetEnabled} from "@/components/chat/model/chat-context";
import {TableViewConfigSchema} from "@/model/relation-view-state/table";
import {deepClone, DeepPartial} from "@/platform/object-utils";
import {updateRelationWithPartial} from "@/state/relations/actions/advanced-actions";
import {useLanguageModelState} from "@/state/language-model.state";


// --- Query Tool (unchanged) ---

export const QueryDatabaseTool = tool({
    description: SQLToolDescription,
    inputSchema: z.object({
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

        try {
            const result = await connection.executeQuery(query, useLanguageModelState.getState().isReadOnly());

            // Limit rows for very large result sets
            if (result.rows.length > 200) {
                const firstTenRows = result.rows.slice(0, 10);
                const previewMarkdown = RelationDataToMarkdown({
                    columns: result.columns,
                    rows: firstTenRows
                });
                return `Result has ${result.rows.length} rows, only up to 200 rows is allowed for performant display. Use offset and limit to page. Showing first 10 only:\n${previewMarkdown}`;
            }

            const mdResult = RelationDataToMarkdown(result);

            // Limit markdown size
            if (mdResult.length > 5000) {
                const preview = mdResult.slice(0, 200);
                return `Result too large to display (>${mdResult.length} chars, ${result.rows.length} rows). Showing first 200 characters:\n${preview}`;
            }

            return `Query successful:\n${mdResult}`;
        } catch (error: any) {
            console.error('Error executing query:', error);
            return `Error executing query: ${error.message}`;
        }
    },
});

// --- Shared helpers ---

interface ChartViewDataArgs {
    title?: string;
    sql: string;
    chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
    xAxis: string;
    xLabelRotation?: number;
    yAxes: string[];
    yRangeMin?: 'min' | 'zero';
}

export function getDefaultRelationBockData(sql: string, viewType: RelationViewType): RelationState {
    const randomId = getRandomId();
    const source: RelationSourceQuery = {
        type: "query",
        baseQuery: sql,
        id: randomId,
        name: "New Query"
    }

    return RelationActions.create({source, viewType, showCode: false});
}

function getChartViewState(args: ChartViewDataArgs): ChartViewState {

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
    }
}

// --- Dashboard insertion helper ---

const DASHBOARD_BLOCK_DEFAULT_CONFIG: any = {
    placeholder: "Add a new relation",
    getInputManager: () => null,
}

function insertBlockIntoDashboard(targetId: string, blockType: string, data: any): string {
    const hasEditor = EditorsService.getInstance().hasEditor(targetId);
    if (!hasEditor) {
        return `Error: No editor found for dashboard "${targetId}". The dashboard tab may not be fully loaded.`;
    }
    const editor = EditorsService.getInstance().getEditor(targetId);
    const currentNumberOfBlocks = editor.editor.blocks.getBlocksCount();
    editor.editor.blocks.insert(blockType, data, DASHBOARD_BLOCK_DEFAULT_CONFIG, currentNumberOfBlocks);
    return '';
}

const TARGET_DESCRIPTION = 'Where to place the result. Use "chat" to show inline in the chat, or a target ID (e.g. "dashboard-abc123" or "relation-xyz") to add to that tab. Use the readTarget tool to see available targets.';

// --- Chart Tool (unified) ---

const ChartToolInputSchema = z.object({
    target: z.string().describe(TARGET_DESCRIPTION),
    sql: z.string().describe('The SQL query to execute for the chart.'),
    chartType: z.enum(['bar', 'line', 'pie']).describe('The type of chart to create.'),
    xAxis: z.string().describe('The column to use for the x-axis.'),
    xLabelRotation: z.number().optional().describe('Rotation of x-axis labels. For long labels like names, use -30.'),
    yRangeMin: z.enum(['min', 'zero']).optional().describe('For values like counts etc. that have a reference to zero, use "zero". For other values, use "min".'),
    yAxes: z.array(z.string()).describe('The columns to use for the y-axes.'),
    title: z.string().optional().describe('The title of the chart.')
});

function chartInputToPartialRelation(input: z.infer<typeof ChartToolInputSchema>): DeepPartial<RelationState> {
    const chartViewState = getChartViewState({
        title: input.title,
        sql: input.sql,
        chartType: input.chartType,
        xAxis: input.xAxis,
        xLabelRotation: input.xLabelRotation,
        yAxes: input.yAxes,
        yRangeMin: input.yRangeMin,
    });
    return {
        query: {
            baseQuery: input.sql,
            activeBaseQuery: input.sql,
        },
        viewState: {
            selectedView: 'chart',
            chartState: chartViewState,
            fullscreenSessionState: {
                codeFenceState: {show: false, sizePercentage: 30, layout: 'row'},
                configState: {showConfig: false, configSplitRatio: 0.5, configSplitLayout: 'column'},
            },
        }
    };
}

export const ChartTool = tool({
    description: 'Creates a chart from a SQL query. Can show it in chat, add it to a dashboard, or update a relation tab.',
    inputSchema: ChartToolInputSchema,
    execute: async (args) => {
        const {target, sql} = args;

        // 1. Get Base and partial update from input
        const partialUpdate = chartInputToPartialRelation(args);
        const base = GetBase(target, sql, 'chart');

        // 2. Merge with existing relation
        const data = updateRelationWithPartial(base, partialUpdate);

        // 3. Route the target
        return RouteAndApplyTarget(target, data);
    }
});

// --- Table Tool (unified) ---

type TargetType = 'chat' | 'dashboard' | 'relation';

function getTargetType(target: string): TargetType {
    if (target === 'chat') return 'chat';
    if (target.startsWith('dashboard')) return 'dashboard';
    if (target.startsWith('relation')) return 'relation';
    throw new Error(`Unknown target type for target "${target}".`);
}

const TableToolInputSchema = z.object({
    target: z.string().describe(TARGET_DESCRIPTION),
    sql: z.string().describe('The SQL query to execute for the table content.'),
    showNumberOfRows: z.enum(['5', '10', '50']).optional().describe('The number of rows to show in the table on one page. Defaults to 10.'),
    tableConfig: TableViewConfigSchema.partial().optional().describe('Optional table display configuration.'),
});

function tableInputToPartialRelation(input: z.infer<typeof TableToolInputSchema>): DeepPartial<RelationState> {
    return {
        query: {
            baseQuery: input.sql,
            activeBaseQuery: input.sql,
            viewParameters: {
                table: {
                    limit: input.showNumberOfRows ? parseInt(input.showNumberOfRows) : undefined,
                }
            }
        },
        viewState: {
            tableState: input.tableConfig
        }
    };
}

function GetBase(targetId: string, sql: string, viewType: RelationViewType): RelationState {
    const targetType = getTargetType(targetId);
    let base = getDefaultRelationBockData(sql, viewType);
    if (targetType === 'relation') {
        base = useRelationsState.getState().relations[targetId];
    }
    return base;
}

async function RouteAndApplyTarget(target: string, data: RelationState): Promise<string | RelationState> {

    const readOnly = useLanguageModelState.getState().isReadOnly();

    // Guard: reject targets the user has disabled in the context bar
    if (target !== 'chat' && !isTargetEnabled(target)) {
        return `Error: Target "${target}" is not enabled. The user has disabled this target in the context bar.`;
    }

    switch (getTargetType(target)) {
        case 'chat':
            const executed = await executeQueryOfRelation(data, undefined, readOnly);
            if (executed.executionState.state === 'error') {
                return `Error executing query: ${JSON.stringify(executed.executionState.error, null, 2)}`;
            } else {
                return executed;
            }
        case 'relation':
            const updateRelation = useRelationsState.getState().updateRelation;
            const actions = getRelationActions({
                mode: 'fullscreen',
                relationState: data,
                updateRelation: updateRelation
            });
            useRelationsState.getState().updateRelation(deepClone(data));
            await actions.updateRelationDataWithBaseQuery(data.query.baseQuery);
            return `Relation was updated successfully.`;
        case 'dashboard': {
            throw new Error('Dashboard target not implemented yet, readonly is not supported yet.');
            // const error = insertBlockIntoDashboard(target, RELATION_BLOCK_NAME, data);
            // return error || `Table was added successfully to the dashboard.`;
        }
    }
}

export const TableTool = tool({
    description: 'Runs a SQL query and renders the result as a table. Targets: chat (inlined automatically, no need to put the data in the chat again), dashboard, or relation tab.',
    inputSchema: TableToolInputSchema,
    execute: async (props) => {
        const {target, sql} = props;

        // 1. Get Base and partial update from input
        const partialUpdate = tableInputToPartialRelation(props);
        const base = GetBase(target, sql, 'table');

        // 2. Relation target: merge with existing relation and re-execute
        const data = updateRelationWithPartial(base, partialUpdate);
        if (data.executionState.state === 'error') {
            return `Error executing query: ${JSON.stringify(data.executionState.error, null, 2)}`;
        }

        // 3. Route the target
        return RouteAndApplyTarget(target, data);
    }
});

// --- Markdown Tool (unified) ---

export const MarkdownTool = tool({
    description: 'Adds markdown content to a dashboard. When targeting chat, the markdown is returned as text.',
    inputSchema: z.object({
        target: z.string().describe(TARGET_DESCRIPTION),
        markdown: z.string().describe('The markdown content.')
    }),
    execute: async ({target, markdown}) => {
        // Chat target: just return the markdown text
        if (target === 'chat') {
            return markdown;
        }

        // Dashboard target: insert markdown blocks
        if (target.startsWith('dashboard')) {
            const hasEditor = EditorsService.getInstance().hasEditor(target);
            if (!hasEditor) {
                return `Error: No editor found for dashboard "${target}". The dashboard tab may not be fully loaded.`;
            }
            const editor = EditorsService.getInstance().getEditor(target);
            const blocks = parseMarkdownToBlocks(markdown);
            for (const block of blocks) {
                const currentNumberOfBlocks = editor.editor.blocks.getBlocksCount();
                editor.editor.blocks.insert(block.type, block.data, {}, currentNumberOfBlocks);
            }
            return `Markdown was added successfully to the dashboard.`;
        }

        // Relation target: not applicable
        if (target.startsWith('relation')) {
            return `Error: Cannot add markdown to a relation tab. Use a dashboard target instead.`;
        }

        return `Error: Unknown target "${target}".`;
    }
});

// --- Read Target Tool ---

export const ReadTargetTool = tool({
    description: 'Reads details about an open tab (dashboard or relation). Use this to understand what is currently in a target before modifying it.',
    inputSchema: z.object({
        targetId: z.string().describe('The ID of the target to read (e.g. "dashboard-abc123" or "relation-xyz").'),
    }),
    execute: async ({targetId}) => {
        const targets = getAvailableTargets();
        const target = targets.find(t => t.id === targetId);

        if (!target) {
            return `Error: Target "${targetId}" not found. Available targets: ${targets.map(t => t.id).join(', ')}`;
        }

        switch (target.type) {
            case 'chat':
                return 'Error: Cannot read the chat target.';

            case 'dashboard': {
                const dashboard = useRelationsState.getState().dashboards[targetId];
                if (!dashboard) return `Error: Dashboard "${targetId}" not found in state.`;
                const blocks = dashboard.elementState?.blocks ?? [];
                const blockSummary = blocks.map(b => b.type).join(', ') || 'none';
                return JSON.stringify({
                    name: target.name,
                    type: 'dashboard',
                    blockCount: blocks.length,
                    blockTypes: blockSummary,
                });
            }

            case 'relation': {
                const relation = useRelationsState.getState().relations[targetId];
                if (!relation) return `Error: Relation "${targetId}" not found in state.`;
                const columns = relation.viewState.schema?.map(c => `${c.name} (${c.type})`) ?? [];
                return JSON.stringify({
                    name: target.name,
                    type: 'relation',
                    query: relation.query.baseQuery,
                    activeQuery: relation.query.activeBaseQuery,
                    viewType: relation.viewState.selectedView,
                    columns: columns,
                });
            }
        }
    }
});

// --- Input Tool (kept as-is, no target param needed) ---

export const AddInputToDashboard = tool({
    description: 'Adds an input element to the dashboard. The input can be used in other queries for interactivity. Usage example: `SELECT * FROM table WHERE column = {{input_id}}`.',
    inputSchema: z.object({
        input_id: z.string().describe('The id of the input element.'),
        inputType: z.enum(['text-select', 'text-field']).describe('Type of the input element: "text-select" for a select input, "text-field" for a text input.'),
    }).describe('Parameters for adding an input to the dashboard.'),
});
