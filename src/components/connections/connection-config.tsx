import React, {FC, ReactElement, useEffect, useMemo, useRef, useState} from "react";
import {CustomForm, FormDefinition} from "@/components/basics/input/custom-form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {validateUrl} from "@/platform/string-validation";
import {ConnectionStringField} from "@/state/connections/duckdb-over-http/widgets";
import {DBConnectionSpec, getDefaultSpec, specToConnection, typeToLabel} from "@/state/connections/configs";
import {DBConnectionType} from "@/components/basics/files/icon-factories";
import {Button} from "@/components/ui/button";
import {Check, Info, LoaderCircle, RefreshCcw, AlertTriangle} from "lucide-react";
import {deepEqual} from "@/platform/object-utils";
import {clearOPFS} from "@/state/connections/duckdb-wasm/duckdb-wasm-provider";


const DUCKDB_WASM_DESCRIPTION =
    "This configuration uses a DuckDB WASM instance in the browser, requiring no extra setup. " +
    "However, it's limited by single-thread performance, a 1GB memory cap, and restricted local file access.";

const DUCKDB_WASM_MOTHERDUCK_DESCRIPTION =
    "This configuration uses DuckDB WASM in the browser and allows you to connect to a MotherDuck. You can then " +
    "effectively query data that is both available in the browser and via MotherDuck. "

const DUCKDB_LOCAL_DESCRIPTION =
    "This setup uses a local DuckDB via HTTP, giving full machine power and file access. DuckDB must be running locally.";

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
                    render: (data) => ConnectionChecker({formData: data.formData, type: 'duckdb-over-http'})
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
                type: 'custom',
                key: 'resetOpfs',
                customField: {
                    render: (data) => ClearOpfsButton()
                },
            },
            {
                type: 'custom',
                key: 'connectionCheck',
                customField: {
                    render: (data) => ConnectionChecker({formData: data.formData, type: 'duckdb-wasm'})
                },
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
            {
                type: 'password',
                label: 'MotherDuck Token',
                key: 'token',
            },
            {
                type: 'custom',
                key: 'connectionCheck',
                customField: {
                    render: (data) => ConnectionChecker({formData: data.formData, type: 'duckdb-wasm-motherduck'})
                },
            },
        ]
    }
}

export function ClearOpfsButton() {

    // if not debug mode, don't show this button
    if(process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <>
            <div className=" text-sm text-muted-foreground">
                Sometimes, especially during development, the DuckDB WASM instance can get into a bad state. You can
                erase all data stored in the browser by clicking the button below. All local databases will be lost.
            </div>
            <Button
                onClick={clearOPFS}
                variant="destructive"
                size={"sm"}
            >
                Reset Database
            </Button>
        </>
    )
}

export interface ConnectionCheckerProps {
    formData: any;
    type: DBConnectionType;
}
export function ConnectionChecker({formData, type}: ConnectionCheckerProps) {
    const [working, setWorking] = useState<boolean | null>(null);
    const [message, setMessage] = useState<string | undefined>(undefined);

    // Persist across renders
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSpec = useRef<{ type: DBConnectionType; formData: any } | null>(null);
    const runId = useRef(0); // prevents stale async results from updating state

    useEffect(() => {
        const specChanged =
            !lastSpec.current ||
            lastSpec.current.type !== type ||
            !deepEqual(lastSpec.current.formData, formData);

        if (specChanged) {
            lastSpec.current = { type, formData };
            triggerConnectionCheckDebounced();
        }
    }, [type, formData]);

    // Clear any pending timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
            }
            // In case a request is mid-flight, bump the runId so its result is ignored
            runId.current++;
        };
    }, []);

    function triggerConnectionCheckDebounced(delay = 500) {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            triggerConnectionCheck();
        }, delay);
    }

    async function triggerConnectionCheck() {
        const thisRun = ++runId.current;

        // Immediately show "Testing..."
        setWorking(null);
        setMessage(undefined);

        const spec: DBConnectionSpec = { type, config: formData };
        const con = specToConnection(spec);

        try {
            const status = await con.initialise();

            // Only apply if this is still the latest run
            if (thisRun === runId.current) {
                setWorking(status.state === "connected");
                setMessage(status.message);
            }
        } finally {
            await con.destroy();
        }
    }

    function handleManualRefresh(event: React.MouseEvent) {
        event.stopPropagation();
        event.preventDefault();

        lastSpec.current = { type, formData };
        triggerConnectionCheckDebounced();
    }

    return (
        <div>
            <div className="flex text-sm items-center h-6 group transition-opacity duration-200 gap-2">
                <div
                    className="inline-flex items-center space-x-2 py-2"
                    style={{
                        color: working === null ? '#888888' : working === true ? '#16a34a' : '#dc2626'
                    }}
                >
                    <span className="text-sm font-medium">
                        {working === null && 'Testing ...'}
                        {working === true && 'Test successful'}
                        {working === false && 'Test failed'}
                    </span>
                    <div className="flex-shrink-0 ">
                        {working === null && <LoaderCircle size={16} className="animate-spin" />}
                        {working === true && <Check size={16} />}
                        {working === false && <AlertTriangle className={'mb-1'} size={16} />}
                    </div>
                </div>
                <Button
                    className="group-hover:opacity-100 opacity-0 transition-opacity duration-200"
                    style={{ width: 24, height: 24 }}
                    variant="ghost"
                    size="icon"
                    onClick={handleManualRefresh}
                >
                    <RefreshCcw size={16} />
                </Button>
            </div>
            {message && (
                <div className="text-xs text-muted-foreground mt-1">
                    {message}
                </div>
            )}
        </div>
    );
}


export interface ConnectionConfigProps {
    spec: DBConnectionSpec;
    onSpecChange: (spec: DBConnectionSpec) => void;
    onSpecSave?: (spec: DBConnectionSpec) => void;
}

export const FormWrapper: FC<{ children: ReactElement }> = ({children}) => (
    <div className="rounded-md border-separate border p-4 mb-4">
        {children}
    </div>
)

export function ConnectionConfig({spec, onSpecChange, onSpecSave}: ConnectionConfigProps) {

    const selectedFromDefinition = FROM_DEFINITIONS[spec.type];

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
        <div className="w-full h-full">
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
                        submitButtonLabel={"Connect"}
                        formWrapper={FormWrapper}
                    />

                </div>
            </div>


        </div>
    );
}