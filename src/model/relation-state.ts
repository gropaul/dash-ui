import {
    Relation,
    RelationData,
    RelationSource
} from "@/model/relation";
import {
    RelationViewState,
    RelationViewType,
    updateRelationViewState
} from "@/model/relation-view-state";
import {cleanAndSplitSQL, escapeName, minifySQL, removeSemicolon, turnQueryIntoSubquery} from "@/platform/sql-utils";
import {getErrorMessage} from "@/platform/error-handling";
import {ConnectionsService} from "@/state/connections/connections-service";
import {useRelationDataState} from "@/state/relations-data.state";
import {CHART_QUERY_LIMIT, COUNT_QUERY_THRESHOLD_MS} from "@/platform/global-data";
import {HistDataType} from "@/components/relation/table/table-head/stats/column-stats-view-hist";
import {ViewManager} from "@/model/relation-state/relation-view";
import {ChartQueryParameters} from "@/model/relation-state/relation-view-chart";
import {TableQueryParameters} from "@/model/relation-state/relation-view-table";
import {SelectQueryParameters} from "@/model/relation-state/relation-view-select";
import {TextViewParameters} from "@/model/relation-state/relation-view-text";
import {SliderQueryParameters} from "@/model/relation-state/relation-view-slider";
import {Column} from "@/model/data-source-connection";
import {RelationQueryState} from "@/model/relation-query-state";

//! Is called when the user changes the code and reruns the query -> Reset some view parameters
export function resetQueryParams(queryData: QueryData): RelationQueryParameters {
    const oldParams = queryData.viewParameters;

    if (oldParams.type === 'table') {
        return {
            ...oldParams,
            type: 'table',
            table: {
                ...oldParams.table,
                sorting: {},
                filters: {},
                offset: 0,
            },
        };
    } else if (oldParams.type === 'chart') {
        return {
            ...oldParams,
            type: 'chart',
        };
    } else if (oldParams.type === 'select') {
        return {
            ...oldParams,
        };
    } else if (oldParams.type === 'text') {
        return {
            ...oldParams,
        };
    } else if (oldParams.type === 'slider') {
        return {
            ...oldParams,
        };
    } else {
        throw new Error(`Unknown view type during reset query parameters: ${oldParams.type}`);
    }
}

export interface RelationQueryParameters {
    type: RelationViewType;
    table: TableQueryParameters;
    chart?: ChartQueryParameters;
    select?: SelectQueryParameters;
    text?: TextViewParameters;
    slider?: SliderQueryParameters;
}

export type TaskExecutionState = {
    state: 'not-started' | 'running' | 'success'
} | {
    state: 'error'
    error: Record<string, any>;
}

// idle: no query is running, running: query is running, success: query was successful, error: query failed
export interface QueryExecutionMetaData {
    lastExecutionDuration: number; // in s
    lastResultCount?: number;
    lastResultOffset?: number;
    lastExecutedAt?: number; // timestamp in ms
}


export type ColumnStatsType = 'histogram' | 'top-n' | 'minMax' | 'non_null';

export interface ColumnStatsBase {
    type: ColumnStatsType;
}

export interface ColumnStatsNonNull extends ColumnStatsBase {
    type: 'non_null';
    nonNullCount: number;
}

export interface ColumnStatsMinMax extends ColumnStatsBase {
    type: 'minMax';
    nonNullCount: number;
    min: number | string;
    max: number | string;
}


export interface ColumnStatsHistogram extends ColumnStatsBase {
    type: 'histogram';
    nonNullCount: number;
    min: number | string;
    max: number | string;
    values: { [key: number]: number }; // example: { "1": 10, "2": 5 } means value 1 occurred 10 times, value 2 occurred 5 times
    histogramType: HistDataType;
}

export interface ColumnStatsTopN extends ColumnStatsBase {
    type: 'top-n';
    nonNullCount: number;
    topValues: { value: any; count: number }[]; // example: [ { value: "A", count: 10 }, { value: "B", count: 5 } ]
    othersCount?: number; // count of all other values not in topValues
}

export type ColumnStats = ColumnStatsHistogram | ColumnStatsTopN | ColumnStatsMinMax | ColumnStatsNonNull;

export type RelationStatState = 'empty' | 'loading' | 'error' | 'ready';

export interface RelationStatsBase {
    state: RelationStatState;
}

export interface RelationStatsEmpty extends RelationStatsBase {
    state: 'empty';
}

export interface RelationStatsLoading extends RelationStatsBase {
    state: 'loading';
}

export function GetRelationStatsLoading(): RelationStatsLoading {
    return {
        state: 'loading'
    };
}

export interface RelationStatsError extends RelationStatsBase {
    state: 'error';
    error: string;
}

export interface RelationStatsReady extends RelationStatsBase {
    state: 'ready';
    columns: ColumnStats[]; // same order as the columns in the relation
}

export type RelationStats = RelationStatsLoading | RelationStatsError | RelationStatsReady | RelationStatsEmpty;

export function GetStatForColumn(column_index: number, stats: RelationStats): ColumnStats | undefined {
    if (stats.state !== 'ready') {
        return undefined;
    }
    return stats.columns[column_index];
}

export interface RelationWithQuery extends Relation {
    query: QueryData;
    executionState: TaskExecutionState;
    lastExecutionMetaData?: QueryExecutionMetaData;
}

export function ShouldUpdateStats(relation: RelationState): boolean {
    return false;
    // return relation.viewState.selectedView === 'table' &&
    //     relation.viewState.tableState.showStats === true;
}

export interface RelationState extends RelationWithQuery {
    viewState: RelationViewState;
    queryState?: RelationQueryState;
}

export function getBaseQueryFromSource(source: RelationSource): string {
    if (source.type === 'table') {
        return minifySQL(`SELECT *
                          FROM "${source.database}"."${source.schema}"."${source.tableName}";`);
    } else if (source.type === 'file') {
        return minifySQL(`SELECT * FROM '${source.path}';`);
    } else if (source.type === 'query') {
        return source.baseQuery;
    } else {
        throw new Error(`Unknown relation type: ${source}`);
    }
}

export interface QueryBuildResult {
    // the queries that must be run before the actual view query/count query
    initialQueries: string[];
    // the final query that was built from the base query, this is what the viewQuery is based on
    finalQuery: string;
    // The query to get the data for the view
    viewQuery: string;
    // the query getting the count for the view Query
    countQuery?: string;

    // the schema of the query created with "DESCRIBE finalQuery"
    schema: Column[]
}

export interface QueryData {
    // the query that the user defined, e.g. FROM basetable, changes the moment the user edits the code
    baseQuery: string;
    // the query that all new QueryParams should use as a base. This will be updated from the baseQuery when the user
    // re-runs the query using the Play Button. But only adding an OrderBy or Filter will still use the last activeBaseQuery
    activeBaseQuery: string;
    viewParameters: RelationQueryParameters;
}

// 2. The async version that checks executability
export async function buildQueryWithCheck(relation: RelationState): Promise<QueryBuildResult> {
    // Build the queries first
    const {
        initialQueries,
        finalQuery,
        viewQuery,
        countQuery,
        schema,
    } = await ViewManager.instance.buildQuery(relation);

    // Then do your async check:
    const executable = await ConnectionsService
        .getInstance()
        .checkIfQueryIsExecutable(viewQuery);

    console.log('Test: Executable:', executable);

    // If not executable, fallback
    return {
        finalQuery,
        countQuery: executable ? countQuery : undefined,
        viewQuery: executable ? viewQuery : finalQuery,
        initialQueries,
        schema
    };
}

export function setRelationRunning(relation: RelationState): RelationState {
    return {
        ...relation,
        executionState: {
            state: 'running',
        },
    };
}

export function returnEmptyErrorState(relation: RelationState, error: unknown): RelationState {
    // Show the code fence in both modes so the user can see/fix the query
    const fs = relation.viewState.fullscreenSessionState;
    const em = relation.viewState.embeddedSessionState;
    return {
        ...relation,
        viewState: {
            ...relation.viewState,
            fullscreenSessionState: fs ? {...fs, codeFenceState: {...fs.codeFenceState, show: true}} : undefined,
            embeddedSessionState: em ? {...em, codeFenceState: {...em.codeFenceState, show: true}} : undefined,
        },
        executionState: {
            state: 'error',
            error: getErrorMessage(error),
        },
    }
}

// builds and executes the query and updates the view state
export async function executeQueryOfRelation(input: RelationState, readOnly: boolean = false): Promise<RelationState> {

    const buildResult = await buildQueryWithCheck(input);

    // start a timer to measure the query duration
    const start = performance.now();

    // first execute the initial queries
    for (const query of buildResult.initialQueries) {
        try {
            await ConnectionsService.getInstance().executeQuery(query, readOnly);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    }

    let viewData: RelationData;
    let viewQueryDurationMs = 0;
    if (buildResult.viewQuery) {
        try {
            const viewQueryStart = performance.now();
            const cacheResult = await useRelationDataState.getState().updateDataFromQuery(input, buildResult.viewQuery, readOnly);
            viewQueryDurationMs = performance.now() - viewQueryStart;
            viewData = cacheResult.data;
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    } else {
        viewData = {
            columns: [],
            rows: [],
        };
    }

    let schemaColumns = buildResult.schema;

    let count = undefined;
    if (buildResult.countQuery && viewQueryDurationMs <= COUNT_QUERY_THRESHOLD_MS) {
        try {
            const countData = await ConnectionsService.getInstance().executeQuery(buildResult.countQuery, readOnly);
            count = Number(countData.rows[0][0]);
        } catch (e) {
            return returnEmptyErrorState(input, e);
        }
    }
    // console.log(`View query executed in ${viewQueryDurationMs.toFixed(2)} ms. Count query executed: ${count !== undefined}`);

    // stop the timer, get duration in s
    const end = performance.now();
    const duration = (end - start) / 1000;

    input.viewState.schema = schemaColumns;
    // update the view state with the new data
    const newViewState: RelationState = {
        ...input,
        executionState: {
            state: 'success',
        },
        lastExecutionMetaData: {
            lastExecutionDuration: duration,
            lastResultCount: count,
            lastResultOffset: input.query.viewParameters.table.offset,
            lastExecutedAt: Date.now(),
        },
        viewState: updateRelationViewState(input.viewState, viewData),
    }

    if (ShouldUpdateStats(input)) {
        // this should be asynchronous, we don't want to block the user
        useRelationDataState.getState().updateStats(newViewState, viewData);
    }

    return newViewState;
}