import {FormFieldCustomProps} from "@/components/basics/input/custom-form";
import {SqlEditor} from "@/components/basics/sql-editor/sql-editor";
import {DuckDBOverHttpConfig} from "@/state/connections/duckdb-over-http";


export function showConnectionStringIfLocalHost(formData: any) {
    return formData['url'].includes('localhost') || formData['url'].includes('127.0.0.1');
}

export function ConnectionStringField({formData, hasError}: FormFieldCustomProps<DuckDBOverHttpConfig>) {

    // display the connection string and have a copy button, but only if the form is valid otherwise grayed out
    const getConnectionString = (hide_secrets: boolean) => {
        let install = "INSTALL duck_explorer FROM community;\n"
        install += "LOAD duck_explorer;"

        let start_server: string;
        let port: number
        try {
            let url = new URL(formData['url']);
            if (!url.port) {
                // Empty port -> default port for http(s)
                port = url.protocol === "http:" ? 80 : 443;
            } else {
                port = +url.port;
            }
        } catch (e) {
            return "invalid url"
        }


        if (formData.useAuthentication) {
            let token = formData.token
            if (hide_secrets) {
                token = '********';
            }
            start_server = `CALL start_duck_explorer('127.0.0.1', ${port}, api_key='${token}');`;
        } else {
            start_server = `CALL start_duck_explorer('127.0.0.1', ${port});`;
        }

        return `${install}\n${start_server}`;
    }

    return (
        <SqlEditor
            rounded={true}
            height={"6rem"}
            language="sql"
            readOnly={true}
            displayCode={getConnectionString(true)}
            copyCode={getConnectionString(false)}
            showCopyButton={!hasError}
            showLineNumbers={false}
        />
    )

}