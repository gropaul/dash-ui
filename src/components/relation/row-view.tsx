import {Row} from "@/model/relation";


export interface RowViewProps {
    row: Row
}

export function RowView(props: RowViewProps) {
    const row = props.row;
    return (
        <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            {
                row.map((element: any, index) => {
                    return <td key={index} className="px-2 py-1">
                        {element.toString()}
                    </td>;
                })
            }
        </tr>
    )
}