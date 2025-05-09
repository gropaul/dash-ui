import {FormFieldCustomProps} from "@/components/basics/input/custom-form";
import {DuckDBOverHttpConfig} from "@/state/connections-database/duckdb-over-http";
import {CodeFence} from "@/components/basics/code-fence/code-fence";


export function showConnectionStringIfLocalHost(formData: any) {
    return formData['url'].includes('localhost') || formData['url'].includes('127.0.0.1');
}

export function ConnectionStringField({formData, hasError}: FormFieldCustomProps<DuckDBOverHttpConfig>) {

    // display the connection string and have a copy button, but only if the form is valid otherwise grayed out
    const getConnectionString = (hide_secrets: boolean) => {
        let install = "INSTALL dash FROM community;\n"
        install += "LOAD dash;"

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

        if (formData.useToken) {
            let token = formData.token
            if (hide_secrets) {
                token = '********';
            }
            start_server = `CALL start_dash('127.0.0.1', ${port}, enable_cors=true, api_key='${token}');`;
        } else {
            start_server = `CALL start_dash('127.0.0.1', ${port}, enable_cors=true);`;
        }
        return `${install}\n${start_server}`;
    }

    return (
        <CodeFence
            displayCode={getConnectionString(true)}
            copyCode={getConnectionString(false)}
            showCopyButton={!hasError}
            showLineNumbers={false}
        />
    )

}