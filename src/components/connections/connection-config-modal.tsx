

import React, { FC } from 'react';
import {DataConnection, DataConnectionConfig} from "@/state/connections.state";
import {CustomForm} from "@/components/basics/input/custom-form";

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: DataConnectionConfig) => void;
    connection: DataConnection
}

export function ConnectionConfigModel({isOpen, onClose, onSave, connection}: ConfigModalProps) {
    if (!isOpen) return null;

    return (
        <div className="z-50 fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-semibold mb-4">Connection Configuration</h2>

                {/* Configuration form goes here */}

                <CustomForm
                    initialFormData={connection.config}
                    formDefinition={connection.configForm}
                    onSubmit={onSave}
                    onCancel={onClose}
                />
            </div>
        </div>
    );
};

export default ConnectionConfigModel;
