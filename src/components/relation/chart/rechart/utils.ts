import {RelationData} from "@/model/relation";
import {ChartConfig} from "@/components/relation/chart/rechart/config";


export function  getReChartDataFromConfig(data: RelationData, config: ChartConfig): any[] {
    const neededColumns = [config.plot.xAxis.columnName, config.plot.yAxis.columnName];
    return getReChartDataFromRelation(data, neededColumns);
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