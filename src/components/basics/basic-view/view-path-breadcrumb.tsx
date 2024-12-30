import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList} from "@/components/ui/breadcrumb";
import {Fragment} from "react";


interface ViewPathBreadcrumbProps {
    path: string[]
    onClick?: (element: string, index: number) => void
}

export function ViewPathBreadcrumb(props: ViewPathBreadcrumbProps) {
    return (
        <Breadcrumb className="text-muted max-w-full overflow-hidden">
            <BreadcrumbList className={'gap-x-1.5 sm:gap-x-1.5 gap-y-0.5 sm:gap-y-0.5'}>

                {props.path.map((path, index) => {
                    return <Fragment key={index}>
                        {index != 0 && <div>
                            /
                        </div>
                        }
                        <BreadcrumbItem key={index}>
                            <BreadcrumbLink
                                className={'cursor-pointer'}
                                onClick={() => props?.onClick?.(path, index)}
                            >{path}</BreadcrumbLink>
                        </BreadcrumbItem>
                    </Fragment>
                })}

            </BreadcrumbList>
        </Breadcrumb>
    )
}