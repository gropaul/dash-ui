import React, {FC, ReactElement} from "react";
import {CustomForm, FormDefinition} from "@/components/basics/input/custom-form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField} from "@/state/connections/duckdb-over-http/widgets";
import {DuckInstanceType, useDuckProxyState} from "@/duckdb/state";


const DUCKDB_WASM_DESCRIPTION =
    "This configuration uses a DuckDB WASM instance in the browser, requiring no extra setup. " +
    "However, it's limited by single-thread performance, a 1GB memory cap, and restricted local file access.";

const DUCKDB_WASM_MOTHERDUCK_DESCRIPTION =
    "This configuration uses DuckDB WASM in the browser and allows you to connect to a MotherDuck. You can then " +
    "effectively query data that is both available in the browser and via MotherDuck. "

const DUCKDB_LOCAL_DESCRIPTION =
    "This configuration uses a local DuckDB instance via HTTP, giving you full machine power and unrestricted local file access. " +
    "You must have DuckDB running locally. You can also connect to MotherDuck.";

const configurations: Record<DuckInstanceType, FormDefinition> = {
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
    "motherduck-wasm": {
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
    },
    "local-duckdb": {
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
                key: 'useAuthentication',
                required: false,
            },
            {
                type: 'password',
                label: 'Token',
                key: 'token',
                required: true,
                shouldBeVisible: (formData) => formData['useAuthentication'],
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
            }
        ]
    }
}

export const ConnectionConfig = () => {
    const [instanceType, setInstanceType] = React.useState<DuckInstanceType>("local-duckdb");

    const selectedConfig = configurations[instanceType];
    const setDuckProxy = useDuckProxyState(state => state.setConfig);

    const FormWrapper: FC<{ children: ReactElement }> = ({children}) => (
        <div className="rounded-md border-separate border p-4 mb-4">
            {children}
        </div>
    )

    function onSubmit(form: any) {
        setDuckProxy({
            type: instanceType,
            ...form
        });
    }

    return (
        <div className="max-w-xl w-full h-full mx-auto">
            <div className="flex items-center flex-col justify-between h-full">

                <div className="min-w-full">
                    <Select value={instanceType} onValueChange={(v) => setInstanceType(v as DuckInstanceType)}>
                        <SelectTrigger className="mb-4">
                            <SelectValue placeholder="DuckDB instance"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="local-duckdb">Local DuckDB</SelectItem>
                            <SelectItem value="duckdb-wasm">DuckDB Wasm</SelectItem>
                            <SelectItem value="motherduck-wasm">DuckDB Wasm & MotherDuck</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full flex-grow">
                    <CustomForm
                        className="h-full flex flex-col justify-between"
                        initialFormData={{}} formDefinition={selectedConfig} onSubmit={onSubmit}
                        formWrapper={FormWrapper}
                    />

                </div>
            </div>


        </div>
    );
}