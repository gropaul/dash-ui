import {createContext} from "react";
import {KEYS, TElement} from "platejs";

export interface PageLink {
    id: string;
    name: string;
    /** The link's path from the current page. */
    path: string;
}

/** What the open page's links point to; given by the host, which knows the project's pages. */
export interface PageLinks {
    resolve: (url: string) => { id: string, name: string } | undefined;
    /** The pages a link can be added to, with their paths. */
    pages: () => PageLink[];
    /** The page's address in the app, for opening it in a new tab. */
    href: (id: string) => string;
    navigate: (id: string) => void;
}

export const PageLinksContext = createContext<PageLinks | undefined>(undefined);

export function createPageLink({name, path}: PageLink): TElement {
    return {type: KEYS.link, url: path, children: [{text: name}]};
}
