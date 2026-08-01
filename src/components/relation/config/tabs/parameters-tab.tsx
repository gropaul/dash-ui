"use client"

import React from "react";
import {RelationConfigTabProps} from "@/components/relation/config/relation-config-tab";
import {ParameterCard} from "@/components/relation/parameters/parameter-card";
import {ParameterDefinition} from "@/model/relation-view-state/parameters";
import {Label} from "@/components/ui/label";
import {Muted} from "@/components/ui/typography";

/**
 * The `{{param}}` placeholders found in this relation's SQL. The list itself is derived from the
 * SQL by `mergeParameters` on every edit, so this tab only edits each parameter's type, default
 * and description - adding and removing happens by writing the placeholder in the query.
 */
export function ParametersTab(props: RelationConfigTabProps) {
    const parameters = props.relationState.viewState.parametersState?.parameters ?? [];

    function updateParameter(name: string, updates: Partial<ParameterDefinition>) {
        props.updateRelationViewState({
            parametersState: {
                parameters: parameters.map(p => p.name === name ? {...p, ...updates} : p),
            },
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <Label><Muted>Query parameters</Muted></Label>
            {parameters.length === 0 ? (
                <Muted className="text-sm">
                    No parameters. Write <span className="font-mono">{'{{name}}'}</span> in the query
                    to create one; relations that call this one can then pass a value for it.
                </Muted>
            ) : (
                parameters.map(parameter => (
                    <ParameterCard
                        key={parameter.name}
                        parameter={parameter}
                        onUpdate={(updates) => updateParameter(parameter.name, updates)}
                    />
                ))
            )}
            <div className="h-8"/>
        </div>
    );
}
