'use client';

import React from "react";
import {ExternalLink, Maximize2, Minimize2, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {TooltipWrapper} from "@/components/ui/tooltip-wrapper";
import {ViewHeader} from "@/components/basics/basic-view/view-header";
import {defaultIconFactory} from "@/components/basics/files/icon-factories";
import {cn} from "@/lib/utils";
import {CatalogObject, openObjectAsRelation} from "@/components/catalog/catalog-model";

export type DetailMode = 'embedded' | 'full';

/** One segment of the header breadcrumb; earlier crumbs with an `onClick` are navigable. */
export interface Crumb {
    icon?: React.ReactNode;
    label: string;
    onClick?: () => void;
}

/**
 * Shared framing for a catalog detail view — the SAME toolbar and title, whether shown in the
 * side panel (`embedded`) or as the full-screen route (`full`). Only the outer framing differs:
 * `full` uses the shared ViewHeader above a card (like FolderView), `embedded` uses a compact
 * header inside the panel. The body is supplied by the caller as `children`.
 */
export function DetailShell({object, mode, iconType, title, typeLabel, crumbs, onToggleExpand, onClose, children}: {
    object: CatalogObject;
    mode: DetailMode;
    iconType: string;
    title: string;
    typeLabel: string;
    /** When given, the header shows this breadcrumb (e.g. table / column) instead of icon + title. */
    crumbs?: Crumb[];
    onToggleExpand: () => void;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const titleNode = crumbs ? (
        <span className="flex items-center gap-1.5 min-w-0 text-sm">
            {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                const content = <>{c.icon}<span className="truncate">{c.label}</span></>;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="shrink-0 text-muted-foreground/50">/</span>}
                        {c.onClick && !last ? (
                            <button type="button" onClick={c.onClick}
                                    className="flex items-center gap-1.5 min-w-0 text-muted-foreground hover:text-foreground">
                                {content}
                            </button>
                        ) : (
                            <span className={cn("flex items-center gap-1.5 min-w-0",
                                last ? "font-semibold text-foreground" : "text-muted-foreground")}>
                                {content}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </span>
    ) : (
        <span className="flex items-center gap-2 min-w-0">
            {defaultIconFactory(iconType)}
            <span className="text-sm font-semibold truncate">{title}</span>
        </span>
    );

    if (mode === 'full') {
        return (
            <>
                <ViewHeader
                    title={title}
                    titleComponent={<div className="pl-6">{titleNode}</div>}
                    actionButtons={<DetailActions compact={false} object={object} onToggleExpand={onToggleExpand} onClose={onClose}/>}
                />
                <div className="bg-card p-8 border rounded-2xl w-full h-full flex flex-col min-h-0">{children}</div>
            </>
        );
    }

    return (
        <div className="h-full min-h-0 flex flex-col bg-card ">
            <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
                {titleNode}
                <div className="flex-1"/>
                <DetailActions compact={true} object={object} onToggleExpand={onToggleExpand} onClose={onClose}/>
            </div>
            <div className="flex-1 min-h-0 px-4 py-3">{children}</div>
        </div>
    );
}

/** Open / expand-collapse / close actions. Same buttons in both modes; `compact` (embedded)
 *  shrinks them to icons, otherwise (full) they get labels and larger hit targets. */
function DetailActions({compact, object, onToggleExpand, onClose}: {
    compact: boolean;
    object: CatalogObject;
    onToggleExpand: () => void;
    onClose: () => void;
}) {
    const iconBtn = compact ? 'h-7 w-7' : 'h-8 w-8';
    const iconSize = compact ? 14 : 15;

    const buttonVariant = compact ? 'ghost' : 'outline';

    const openInQueryText = 'Query this table'
    return (
        <>
            <TooltipWrapper message={openInQueryText}>
                <Button variant={buttonVariant} size={compact ? 'icon' : 'sm'}
                        className={compact ? 'h-7 w-7' : 'h-8 gap-1'} onClick={() => openObjectAsRelation(object)}
                        aria-label={openInQueryText}>
                    <ExternalLink size={14}/>{!compact && <span>{openInQueryText}</span>}
                </Button>
            </TooltipWrapper>
            {
                compact && <>
                    <Button variant={buttonVariant} size="icon" className={iconBtn} onClick={onToggleExpand}
                            aria-label={compact ? 'Expand to full screen' : 'Collapse'}>
                        {compact ? <Maximize2 size={iconSize}/> : <Minimize2 size={iconSize}/>}
                    </Button>
                    <Button variant={buttonVariant} size="icon" className={iconBtn} onClick={onClose} aria-label="Close details">
                        <X size={iconSize}/>
                    </Button>
                </>
            }
        </>
    );
}
