import {parseDocument} from "yaml";

/** A project's `dash.yaml` (PROJECT_CONFIG_FILE): its id and name. See dev/folder-projects.md. */

export interface ProjectConfig {
    id?: string;
    name?: string;
}

export function parseProjectConfig(text: string | undefined): ProjectConfig {
    if (!text) return {};
    const config = parseDocument(text).toJS() as Record<string, unknown> | null;
    return {
        id: typeof config?.id === 'string' ? config.id : undefined,
        name: typeof config?.name === 'string' ? config.name : undefined,
    };
}

/** `text` with `id` and `name` set; other keys and comments stay. */
export function projectConfigText(text: string | undefined, id: string, name: string): string {
    const document = parseDocument(text ?? '');
    if (!document.contents) return `id: ${id}\nname: ${JSON.stringify(name)}\n`;
    document.set('id', id);
    document.set('name', name);
    return document.toString();
}
