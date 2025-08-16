import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {DBConnectionSpec, specToConnection, typeToLabel} from "@/state/connections/configs";
import {DatabaseConnection} from "@/model/database-connection";
import {useEffect, useState} from "react";
import {DuckDBOverHttpConfig} from "@/state/connections/duckdb-over-http";
import {Eye, EyeOff, Trash2} from "lucide-react";
import {useInitState} from "@/state/init.state";


export function ObscurableString(props: { value: string }) {
    const [show, setShow] = useState(false);
    return (
        <div className="flex items-center space-x-1">
            <div className="flex items-center">
                {show ? props.value : '********'}
            </div>
            <div className="text-xs text-gray-500 cursor-pointer" onClick={() => setShow(!show)}>
                {show ? <EyeOff size={16}/> : <Eye size={16} />}
            </div>
        </div>
    );
}

export interface DBConnectionPreviewProps {
    connection: DatabaseConnection;
    onClick?: () => void;
    onDelete?: () => void;
}

export function DBConnectionPreview(props: DBConnectionPreviewProps) {

    const [working, setWorking] = useState<boolean | null>(null);

    useEffect(() => {
        props.connection.initialise().then((status) => {
            setWorking(status.state === 'connected');
        });
    }, [props.connection]);

    function getDetails( connection: DatabaseConnection) {
        if (connection.type === 'duckdb-over-http') {
            const config = connection.config as DuckDBOverHttpConfig;
            return (
                <div className="space-x-1 text-sm flex">
                    <div>{config.url}</div>
                    {config.useToken &&
                        <>
                            <span>Token=</span>
                            <ObscurableString value={config.token!} />
                        </>
                    }
                </div>
            );
        }
    }

    return (
        <div>
            <div
                className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted"
                onClick={props.onClick}
            >
                <div>
                    <div className="font-bold">{typeToLabel(props.connection.type)}</div>
                    {getDetails(props.connection)}
                </div>
                <div className="flex items-center space-x-2">
                    {working === true && <div>✅</div>}
                    {working === false && <div>❌</div>}
                    {props.onDelete && (
                        <div 
                            className="cursor-pointer text-gray-500 hover:text-red-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onDelete?.();
                            }}
                        >
                            <Trash2 size={16} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export interface ConnectionHistoryProps {
    onSpecSelected: (spec: DBConnectionSpec) => void;
}


export function ConnectionHistory(props: ConnectionHistoryProps) {
    let history = useInitState(state => state.connectionHistory);
    const deleteConnectionFromHistory = useInitState(state => state.removeConnectionFromHistory);
    const historyLength = history.length;

    return (
        <Accordion type="single" collapsible className="w-full border-t">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    Connection History ({historyLength})
                </AccordionTrigger>
                <AccordionContent className={'max-h-32 overflow-auto border-t p-0 m-0'}>
                    <div>
                        {history.map((spec, index) => {
                            return (
                                <DBConnectionPreview
                                    onClick={() => props.onSpecSelected(spec)}
                                    connection={specToConnection(spec)}
                                    onDelete={() => deleteConnectionFromHistory(index)}
                                    key={index}
                                />
                            );
                        })}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
