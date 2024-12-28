import React, {FC} from 'react';
import {CustomForm} from "@/components/basics/input/custom-form";
import {DataConnection, DataConnectionConfig} from "@/model/connection";
import {MyDialog} from "@/components/ui/my-dialog";


export interface ConnectionElementProps {
    connection: DataConnection;
    config: DataConnectionConfig;
    hasError: boolean;
}

interface ConfigModalProps {
    isOpen: boolean;
    onOpenChange?: (open: boolean) => void;
    onSave: (config: DataConnectionConfig) => void;
    connection: DataConnection,
    connectionElement?: FC<ConnectionElementProps>;
}

export function ConnectionConfigModal({isOpen, onOpenChange, onSave, connection}: ConfigModalProps) {
    if (!isOpen) return null;

    return (
        <MyDialog open={isOpen} onOpenChange={onOpenChange}>
            <h2 className="text-2xl font-semibold mb-4">Connection Configuration</h2>

            {/* Configuration form goes here */}

            <CustomForm
                initialFormData={connection.config}
                formDefinition={connection.configForm}
                onSubmit={onSave}
                onCancel={() => onOpenChange?.(false)}
            />
        </MyDialog>
    );
}