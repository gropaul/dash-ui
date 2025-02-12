import {RelationData} from "@/model/relation";
import {ChartConfig, PieAxisConfig} from "@/model/relation-view-state/chart";


export function  getReChartDataFromConfig(data: RelationData, config: ChartConfig): any[] {
    const neededColumns = [];

    if (config.plot.cartesian.xAxis) {
        neededColumns.push(config.plot.cartesian.xAxis.columnId);
    }
    for (const yAxis of config.plot.cartesian.yAxes ?? []) {
        neededColumns.push(yAxis.columnId);
    }
    return getReChartDataFromRelation(data, neededColumns);
}

export function getDataForPieChartElement(axis: PieAxisConfig, data: RelationData) {
    let columns = [];
    if (axis.label) {
        columns.push(axis.label.columnId);
    }
    if (axis.radius) {
        columns.push(axis.radius.columnId);
    }
    return getReChartDataFromRelation(data, columns);
}


export function getReChartDataFromRelation(data: RelationData, columns: string[]): any[] {
    const resultSize = data.rows.length;
    const columnNames = data.columns.map((column) => column.name);
    const columnIndices = columns.map((column) => columnNames.indexOf(column));

    // already reserved space for the result
    const result = new Array(resultSize);
    for (let i = 0; i < resultSize; i++) {
        result[i] = {};
        for (let j = 0; j < columns.length; j++) {
            const columnName = columns[j];
            const columnIndex = columnIndices[j];
            result[i][columnName] = data.rows[i][columnIndex];
        }
    }

    return result;
}