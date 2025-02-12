import React, {FC, ReactElement, useEffect, useState} from "react";
import {CustomForm, FormDefinition} from "@/components/basics/input/custom-form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField} from "@/state/connections-database/duckdb-over-http/widgets";
import {DBConnectionSpec, getDefaultSpec, specToConnection, typeToLabel} from "@/state/connections-database/configs";
import {DBConnectionType} from "@/components/basics/files/icon-factories";
import {Button} from "@/components/ui/button";
import {RefreshCcw} from "lucide-react";


const DUCKDB_WASM_DESCRIPTION =
    "This configuration uses a DuckDB WASM instance in the browser, requiring no extra setup. " +
    "However, it's limited by single-thread performance, a 1GB memory cap, and restricted local file access.";

const DUCKDB_WASM_MOTHERDUCK_DESCRIPTION =
    "This configuration uses DuckDB WASM in the browser and allows you to connect to a MotherDuck. You can then " +
    "effectively query data that is both available in the browser and via MotherDuck. "

const DUCKDB_LOCAL_DESCRIPTION =
    "This configuration uses a local DuckDB instance via HTTP, giving you full machine power and unrestricted local file access. " +
    "You must have DuckDB running locally. You can also connect to MotherDuck.";

const FROM_DEFINITIONS: Record<DBConnectionType, FormDefinition> = {
    "duckdb-over-http": {
        fields: [
            {
                type: 'description',
                label: DUCKDB_LOCAL_DESCRIPTION,
                key: 'description'
            },
            {
                type: 'text',
                label: 'URL',
                key: 'url',
                required: true,
                validation: (rawValue: string) => validateUrl(rawValue, 'port_required')
            },
            {
                type: 'boolean',
                label: 'Authentication',
                key: 'useToken',
                required: false,
            },
            {
                type: 'password',
                label: 'Token',
                key: 'token',
                required: true,
                shouldBeVisible: (formData) => formData.useToken === true
            },
            {
                type: 'custom',
                label: 'Connection String',
                key: 'connectionString',
                required: false,
                shouldBeVisible: formData => !validateUrl(formData.url, 'port_required'),
                customField: {
                    render: ConnectionStringField
                }
            },
            {
                type: 'custom',
                key: 'connectionCheck',
                customField: {
                    render: ConnectionChecker // todo: this only works for duckdb-over-http
                },

            },
        ]
    },
    "duckdb-wasm": {
        fields: [
            {
                type: 'description',
                label: DUCKDB_WASM_DESCRIPTION,
                key: 'description'
            },
            {
                type: 'warning',
                label: 'This configuration is still in development.',
                key: 'warning'
            },
        ]
    },
    "duckdb-wasm-motherduck": {
        fields: [
            {
                type: 'description',
                label: DUCKDB_WASM_MOTHERDUCK_DESCRIPTION,
                key: 'description'
            },
            {
                type: 'warning',
                label: 'This configuration is still in development.',
                key: 'warning'
            },
            // {
            //     type: 'password',
            //     label: 'MotherDuck Token',
            //     key: 'motherduckToken',
            //     required: true
            // }
        ]
    }
}

export interface ConnectionCheckerProps {
    formData: any;
}

export function ConnectionChecker({formData}: ConnectionCheckerProps) {
    const [working, setWorking] = useState<boolean | null>(null);

    async function checkConnection() {
        // todo: what do we do if it is another type?
        const spec: DBConnectionSpec = {
            type: 'duckdb-over-http',
            config: formData
        }
        setWorking(null);
        // wait 200ms before checking connection
        await new Promise((resolve) => setTimeout(resolve, 200));
        specToConnection(spec).checkConnectionState().then((status) => {
            setWorking(status.state === 'connected');
        });
    }

    useEffect(() => {
        checkConnection();
    }, [formData]);

    return (
        <div className={"flex text-sm items-center h-6 group transition-opacity duration-200 gap-2"}>
            {working === null &&  <div>Testing ... 🔄</div>}
            {working === true  && <div>Test successful ✅</div>}
            {working === false && <div>Test failed ❌ </div>}
            <Button
                className={"group-hover:opacity-100 opacity-0 transition-opacity duration-200"}
                style={{width: 24, height: 24}}
                variant={"ghost"}
                size={"icon"}
                onClick={checkConnection}>
                <RefreshCcw size={16}/>
            </Button>
        </div>
    );

}

export interface ConnectionConfigProps {
    spec: DBConnectionSpec;
    onSpecChange: (spec: DBConnectionSpec) => void;
    onSpecSave?: (spec: DBConnectionSpec) => void;
}



export function ConnectionConfig({spec, onSpecChange, onSpecSave}: ConnectionConfigProps) {

    const selectedFromDefinition = FROM_DEFINITIONS[spec.type];

    const FormWrapper: FC<{ children: ReactElement }> = ({children}) => (
        <div className="rounded-md border-separate border p-4 mb-4">
            {children}
        </div>
    )

    function onTypeChange(type: DBConnectionType) {
        onSpecChange(getDefaultSpec(type));
    }

    function onSubmit(form: any) {
        onSpecChange({
            type: spec.type,
            config: form
        });
        if (onSpecSave) {
            onSpecSave({
                type: spec.type,
                config: form
            });
        }
    }

    return (
        <div className="max-w-xl w-full h-full">
            <div className="flex items-center flex-col justify-between h-full w-full">
                <div className="min-w-full">
                    <Select value={spec.type} onValueChange={(v) => onTypeChange(v as DBConnectionType)}>
                        <SelectTrigger className="mb-4">
                            <SelectValue placeholder="DuckDB instance"/>
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(FROM_DEFINITIONS).map((type) => (
                                <SelectItem key={type} value={type as DBConnectionType}>
                                    {typeToLabel(type as DBConnectionType)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full flex-grow">
                    <CustomForm
                        className="h-full flex flex-col justify-between"
                        initialFormData={spec.config}
                        formDefinition={selectedFromDefinition}
                        onSubmit={onSubmit}
                        formWrapper={FormWrapper}
                    />

                </div>
            </div>


        </div>
    );
}