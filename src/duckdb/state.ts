import {createWithEqualityFn} from "zustand/traditional";
import {validateUrl} from "@/platform/string-validation";

export type DuckInstanceType = "local-duckdb" | "duckdb-wasm" | "motherduck-wasm";

interface DuckProxyState {
    config: {
        type: "local-duckdb";
        useAuthentication: boolean;
        token: string;
        url: string;
    } | {
        type: "duckdb-wasm";
    } | {
        type: "motherduck-wasm";
        motherduckToken: string;
    } | { type: "none" };

    setConfig: (config: DuckProxyState["config"]) => void;
}

const saveToUrl = (config: DuckProxyState["config"]) => {
    if(typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const possibleKeys = ["type", "useAuthentication", "token", "url", "motherduckToken"];
    for (const key of possibleKeys) {
        params.delete(key);
    }

    switch (config.type) {
        case "local-duckdb":
            params.set("type", "local-duckdb");
            params.set("useAuthentication", config.useAuthentication.toString());
            params.set("token", config.token);
            params.set("url", config.url);
            break;
        case "duckdb-wasm":
            params.set("type", "duckdb-wasm");
            break;
        case "motherduck-wasm":
            params.set("type", "motherduck-wasm");
            params.set("motherduckToken", config.motherduckToken);
            break;
        case "none":
            params.delete("type");
            break;
    }

    window.history.replaceState({}, "", url.toString());
}

const loadFromUrl = (): DuckProxyState["config"] => {
    if (typeof window === "undefined") return {type: "none"};
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const type = params.get("type");
    let config: DuckProxyState["config"] = {type: "none"};
    if (type === "local-duckdb") {
        config = {
            type: "local-duckdb",
            useAuthentication: params.get("useAuthentication") === "true",
            token: params.get("token")!,
            url: params.get("url")!
        } as const
        if (config.useAuthentication && !config.token || !config.url || !validateUrl(config.url, 'port_required')) {
            config = {type: "none"};
        }
    } else if (type === "duckdb-wasm") {
        config = {
            type: "duckdb-wasm"
        }
    } else if (type === "motherduck-wasm") {
        config = {
            type: "motherduck-wasm",
            motherduckToken: params.get("motherduckToken")!
        }
        if (!config.motherduckToken) {
            config = {type: "none"};
        }
    }

    return config;
}


export const useDuckProxyState = createWithEqualityFn<DuckProxyState>((setState, getState) => {
    return {
        config: loadFromUrl(),
        setConfig: (config) => {
            saveToUrl(config);
            setState({...getState(), config});
        }
    }
})