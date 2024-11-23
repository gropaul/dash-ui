import {FormFieldCustomProps} from "@/components/basics/input/custom-form";
import {CodeFence} from "@/components/basics/code-fence/code-fence";
import {DuckDBOverHttpConfig} from "@/state/connections/duckdb-over-http";


export function showConnectionStringIfLocalHost(formData: any) {
    return formData['url'].includes('localhost');
}

export function ConnectionStringField({formData, hasError}: FormFieldCustomProps) {

    formData = formData as DuckDBOverHttpConfig;

    // display the connection string and have a copy button, but only if the form is valid otherwise grayed out
    const getConnectionString = (hide_secrets: boolean) => {

        let install = `INSTALL httpserver FROM community;
LOAD httpserver;`

        let start_server;

        let url = formData['url'];

        let portMatches = url.match(/:(\d+)/);
        // error if there is no port
        if (!portMatches) {
            return 'Invalid URL';
        }
        const port = portMatches[1];

        // SELECT httpserve_start('localhost', 9999, 'user:pass');
        if (formData['authentication'] === 'password') {
            const username = formData['username'];
            let password = formData['password'];

            if (hide_secrets) {
                password = '********';
            }

            start_server = `SELECT httpserve_start('localhost', ${port}, '${username}:${password}');`;
        } else {

            let token = formData['token'];
            if (hide_secrets) {
                token = '********';
            }
            start_server = `SELECT httpserve_start('localhost', ${port}, '${token}');`;
        }

        return `${install}\n${start_server}`;
    }

    return (
        <CodeFence
            height={"4rem"}
            language="sql"
            readOnly={true}
            displayCode={getConnectionString(true)}
            copyCode={getConnectionString(false)}
            showCopyButton={!hasError}
            showLineNumbers={false}
        />
    )

}