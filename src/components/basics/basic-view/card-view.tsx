import React from "react";
import {H5} from "@/components/ui/typography";


interface CardViewProps {
    header: React.ReactNode;
    headerButtons?: React.ReactNode;
    children: React.ReactNode;
}

export function CardView(props: CardViewProps) {

    return (
        <div className={'border border-gray-200 rounded w-72 h-fit'}>
            <div className={'w-full flex items-center justify-between border-b border-gray-200 px-4 py-1'}>
                <div className="flex items-center justify-between space-x-2 w-full">
                    <H5 className="text-md font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {props.header}
                    </H5>
                    <div>
                        {props.headerButtons}
                    </div>
                </div>

            </div>
            <div className={'py-2'}>
                {props.children}
            </div>
        </div>
    )
}
