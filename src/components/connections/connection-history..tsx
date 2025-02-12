import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {useDatabaseConState} from "@/state/connections-database.state";
import {DBConnectionSpec} from "@/state/connections-database/configs";


export interface ConnectionHistoryProps {

}

export function DBConnectionSpecWithId(props: DBConnectionSpec) {
    return (
        <div>
            <div>
                <span>{props.type}</span>
            </div>
            <div>
                <span>{props.config.url}</span>
            </div>
        </div>
    );
}

export function ConnectionHistory(props: ConnectionHistoryProps) {
    let history = useDatabaseConState(state => state.history);
    const historyLength = history.length;

    // repeat each element in the history array 10 times
    history = history.flatMap((x) => Array(10).fill(x));
    const enabled = historyLength > 0;
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    Connection History ({historyLength})
                </AccordionTrigger>
                <AccordionContent className={'max-h-32 overflow-auto border-t'}>
                    <div>
                        {history.map((spec, index) => {
                            return (
                                <DBConnectionSpecWithId key={index} {...spec}/>
                            );
                        })}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}