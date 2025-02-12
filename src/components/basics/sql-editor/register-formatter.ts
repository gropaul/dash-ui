
import { format } from 'sql-formatter';
import {Monaco} from "@monaco-editor/react";


export function registerFormatter(monaco: Monaco){

    // define a document formatting provider
    // then you contextmenu will add a "Format Document" action
    monaco.languages.registerDocumentFormattingEditProvider('sql', {
        provideDocumentFormattingEdits(model, options) {
            const formatted = format(model.getValue());
            return [
                {
                    range: model.getFullModelRange(),
                    text: formatted
                }
            ];
        }
    });

    // define a range formatting provider
    // select some codes and right click those codes
    // you contextmenu will have a "Format Selection" action
    monaco.languages.registerDocumentRangeFormattingEditProvider('sql', {
        provideDocumentRangeFormattingEdits(model, range, options) {
            const formatted = format(model.getValueInRange(range));
            return [
                {
                    range: range,
                    text: formatted
                }
            ];
        }
    });

}