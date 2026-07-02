"use client"

import React from "react"
import {Muted} from "@/components/ui/typography"
import {Separator} from "@/components/ui/separator"
import {Label} from "@/components/ui/label"
import {Toggle} from "@/components/ui/toggle"
import {RelationViewContentProps} from "@/components/relation/relation-view-content"
import {ViewManager} from "@/model/relation-state/relation-view"
import {ColumnSelector} from "@/components/relation/chart/chart-config/column-selector"
import {AxisConfig, getInitialAxisDecoration} from "@/model/relation-view-state/chart"
import {getInitialTextViewStateEmpty, TextDisplayStyle, TextDisplayViewState} from "@/model/relation-view-state/text-display"
import {ColorPalette} from "@/components/ui/color-palette"
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
    Italic,
} from "lucide-react"

const textStyleOptions: { id: TextDisplayStyle; label: string }[] = [
    {id: 'h1', label: 'H1'},
    {id: 'h2', label: 'H2'},
    {id: 'h3', label: 'H3'},
    {id: 'h4', label: 'H4'},
    {id: 'h5', label: 'H5'},
    {id: 'body', label: 'Body'},
    {id: 'code', label: 'Code'},
]

export function TextConfigView(props: RelationViewContentProps) {
    const {relationState} = props
    const params = ViewManager.instance.text.getQueryParameters(relationState)
    const columns = relationState.viewState.schema

    const textDisplayState = relationState.viewState.textDisplayState ?? getInitialTextViewStateEmpty()

    function updateViewState(updates: Partial<TextDisplayViewState>) {
        props.updateRelationViewState({
            textDisplayState: {...textDisplayState, ...updates}
        })
    }

    // Bridge: text stores column by name; ColumnSelector uses AxisConfig with columnId (id === name in schema)
    const titleCol = columns.find(col => col.name === params.titleColumn)
    const subtitleCol = columns.find(col => col.name === params.subtitleColumn)

    const titleAxis: AxisConfig | undefined = titleCol
        ? {columnId: titleCol.id, label: titleCol.name, decoration: getInitialAxisDecoration(0)}
        : undefined

    const subtitleAxis: AxisConfig | undefined = subtitleCol
        ? {columnId: subtitleCol.id, label: subtitleCol.name, decoration: getInitialAxisDecoration(0)}
        : undefined

    async function updateTitleColumn(update: Partial<AxisConfig>) {
        if (!update.columnId) return
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            text: {...params, titleColumn: update.columnId},
        })
    }

    async function updateSubtitleColumn(update: Partial<AxisConfig>) {
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            text: {...params, subtitleColumn: update.columnId},
        })
    }

    async function clearSubtitleColumn() {
        await props.updateRelationDataWithParams({
            ...relationState.query.viewParameters,
            text: {...params, subtitleColumn: undefined},
        })
    }

    return (
        <div className="flex flex-col gap-3">

                        {/* Column pickers */}
                        <Label className="h-3"><Muted>Value</Muted></Label>
                        {columns.length === 0 ? (
                            <Muted>No columns available</Muted>
                        ) : (
                            <ColumnSelector
                                plotType="bar"
                                axisType="sort"
                                axis={titleAxis}
                                columns={columns}
                                updateAxis={updateTitleColumn}
                            />
                        )}

                        <Label className="h-3"><Muted>Description</Muted></Label>
                        {columns.length === 0 ? (
                            <Muted>No columns available</Muted>
                        ) : (
                            <ColumnSelector
                                plotType="bar"
                                axisType="sort"
                                axis={subtitleAxis}
                                columns={columns}
                                updateAxis={updateSubtitleColumn}
                                deleteAxis={clearSubtitleColumn}
                            />
                        )}

                        <Separator/>

                        {/* Text style */}
                        <Label className="h-3"><Muted>Style</Muted></Label>
                        <div className="flex flex-col gap-1 w-full">
                            <div className="grid grid-cols-4 gap-1 w-full">
                                {textStyleOptions.slice(0, 4).map(({id, label}) => (
                                    <Toggle
                                        key={id}
                                        variant="outline"
                                        size="sm"
                                        pressed={textDisplayState.textStyle === id}
                                        onPressedChange={() => updateViewState({textStyle: id})}
                                        className="w-full text-xs"
                                    >
                                        {label}
                                    </Toggle>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-1 w-full">
                                {textStyleOptions.slice(4).map(({id, label}) => (
                                    <Toggle
                                        key={id}
                                        variant="outline"
                                        size="sm"
                                        pressed={textDisplayState.textStyle === id}
                                        onPressedChange={() => updateViewState({textStyle: id})}
                                        className="w-full text-xs"
                                    >
                                        {label}
                                    </Toggle>
                                ))}
                            </div>
                        </div>

                        {/* Italic */}
                        <Toggle
                            variant="outline"
                            size="sm"
                            pressed={textDisplayState.fontStyle === 'italic'}
                            onPressedChange={(p) => updateViewState({fontStyle: p ? 'italic' : 'normal'})}
                            className="w-full"
                        >
                            <Italic className="h-4 w-4 mr-1"/>
                            Italic
                        </Toggle>

                        <Separator/>

                        {/* Alignment */}
                        <Label className="h-3"><Muted>Horizontal</Muted></Label>
                        <div className="grid grid-cols-3 gap-1 w-full">
                            {([
                                {id: 'left', icon: <AlignLeft className="h-4 w-4"/>},
                                {id: 'center', icon: <AlignCenter className="h-4 w-4"/>},
                                {id: 'right', icon: <AlignRight className="h-4 w-4"/>},
                            ] as const).map(({id, icon}) => (
                                <Toggle
                                    key={id}
                                    variant="outline"
                                    size="sm"
                                    pressed={textDisplayState.textAlign === id}
                                    onPressedChange={() => updateViewState({textAlign: id})}
                                    className="w-full"
                                >
                                    {icon}
                                </Toggle>
                            ))}
                        </div>

                        <Label className="h-3"><Muted>Vertical</Muted></Label>
                        <div className="grid grid-cols-3 gap-1 w-full">
                            {([
                                {id: 'top', icon: <AlignVerticalJustifyStart className="h-4 w-4"/>},
                                {id: 'center', icon: <AlignVerticalJustifyCenter className="h-4 w-4"/>},
                                {id: 'bottom', icon: <AlignVerticalJustifyEnd className="h-4 w-4"/>},
                            ] as const).map(({id, icon}) => (
                                <Toggle
                                    key={id}
                                    variant="outline"
                                    size="sm"
                                    pressed={textDisplayState.verticalAlign === id}
                                    onPressedChange={() => updateViewState({verticalAlign: id})}
                                    className="w-full"
                                >
                                    {icon}
                                </Toggle>
                            ))}
                        </div>

                        <Separator/>

                        {/* Color */}
                        <Label className="h-3"><Muted>Color</Muted></Label>
                        <ColorPalette
                            color={textDisplayState.color}
                            onChange={(color) => updateViewState({color})}
                        />

                        <div className="h-8"/>
        </div>
    )
}
