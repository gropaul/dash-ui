import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList} from "@/components/ui/breadcrumb";


interface ViewPathBreadcrumbProps {
    path: string[]
    onClick?: (element: string, index: number) => void
}

export function ViewPathBreadcrumb(props: ViewPathBreadcrumbProps) {
    return (
        <Breadcrumb className={'text-muted'}>
            <BreadcrumbList className={'gap-1.5 sm:gap-1.5'}>

                {props.path.map((path, index) => {
                    return <>
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
                    </>
                })}

            </BreadcrumbList>
        </Breadcrumb>
    )
}