import React, {FC, ReactElement} from "react";
import {CustomForm, FormDefinition} from "@/components/basics/input/custom-form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField} from "@/state/connections/duckdb-over-http/widgets";
import {DuckInstanceType, useDuckProxyState} from "@/duckdb/state";


const configurations: Record<DuckInstanceType, FormDefinition> = {
    "duckdb-wasm": {
        fields: []
    },
    "motherduck-wasm": {
        fields: [{
            type: 'password',
            label: 'MotherDuck Token',
            key: 'motherduckToken',
            required: true
        }]
    },
    "local-duckdb": {
        fields: [
            {
                type: 'boolean',
                label: 'Authentication',
                key: 'useAuthentication',
                required: false,
            },
            {
                type: 'text',
                label: 'URL',
                key: 'url',
                required: true,
                validation: (rawValue: string) => validateUrl(rawValue, 'port_required')
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
        <div className="p-4 rounded-md border-separate border-2">
            {children}
        </div>
    )

    return (
        <div className="max-w-xl w-full h-full mx-auto">
            <div className="flex items-center flex-col justify-between h-full">

                <div className="min-w-full p-4">
                    <Select value={instanceType} onValueChange={(v) => setInstanceType(v as DuckInstanceType)}>
                        <SelectTrigger className="mb-4">
                            <SelectValue placeholder="DuckDB instance"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="local-duckdb">Local DuckDB</SelectItem>
                            <SelectItem value="duckdb-wasm">DuckDB Wasm</SelectItem>
                            <SelectItem value="motherduck-wasm">MotherDuck</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full p-4 flex-grow">
                    <CustomForm className="h-full flex flex-col justify-between"
                                initialFormData={{}} formDefinition={selectedConfig} onSubmit={form => {
                        setDuckProxy({
                            type: instanceType,
                            ...form
                        });
                    }}
                                formWrapper={FormWrapper}/>

                </div>
            </div>


        </div>
    );
}