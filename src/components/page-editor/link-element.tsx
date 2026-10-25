'use client';

import React, {useContext} from "react";
import {FileText} from "lucide-react";
import {TLinkElement} from "platejs";
import {PlateElement, PlateElementProps} from "platejs/react";
import {cn} from "@/lib/utils";
import {isPagePath} from "@/state/routing/page-links";
import {PageLinksContext} from "@/components/page-editor/page-link-context";

/**
 * A markdown link. One to a page of the project shows a page icon and opens the page in the app; others are web
 * links, opened in a new tab. A click follows the link while editing too; cmd/ctrl-click opens it in a new tab.
 * The link's text is still editable from the keyboard.
 */
export function LinkElement(props: PlateElementProps<TLinkElement>) {
    const pageLinks = useContext(PageLinksContext);
    const url = props.element.url;
    const page = pageLinks?.resolve(url);
    const broken = !!pageLinks && !page && isPagePath(url);
    const href = page ? pageLinks!.href(page.id) : broken ? undefined : url;

    // Also prevents the browser's default, which is nothing inside the editable page.
    const open = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!href) return;
        if (page && !e.metaKey && !e.ctrlKey) pageLinks!.navigate(page.id);
        else window.open(href, '_blank', 'noopener');
    };

    return (
        <PlateElement
            {...props}
            as="a"
            className={cn(
                "cursor-pointer font-medium text-primary underline decoration-primary/30 underline-offset-4",
                broken && "text-muted-foreground line-through",
            )}
            attributes={{
                ...props.attributes,
                href,
                ...(!page && {target: '_blank', rel: 'noopener noreferrer'}),
                onClick: open,
            }}
        >
            {page && (
                <span contentEditable={false} className="select-none">
                    <FileText className="mr-0.5 inline h-4 w-4 align-[-3px]"/>
                </span>
            )}
            {props.children}
        </PlateElement>
    );
}
