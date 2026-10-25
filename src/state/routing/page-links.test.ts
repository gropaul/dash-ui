import {describe, expect, it} from 'vitest';
import {EditorFolder} from "@/model/editor-folder";
import {folderPageOf, nameTakenInFolder, pageFolderOf, relativePath, pageNameError, resolvePageLink, resolveQueryInput, withPartnerMoves} from "@/state/routing/page-links";

const node = (id: string, type: string, name: string, children: EditorFolder[] | null = null) =>
    ({id, type, name, children}) as EditorFolder;

const tree = [
    node('reports', 'folder', 'Reports', [
        node('trains', 'dashboards', 'Train services'),
        node('q3', 'folder', 'Q3', [node('sales', 'dashboards', 'Sales')]),
    ]),
    node('home', 'dashboards', 'Home'),
];

describe('page links', () => {
    it('are paths relative to the linking page', () => {
        expect(relativePath(tree, 'sales', 'trains')).toBe('../Train services.md');
        expect(relativePath(tree, 'trains', 'sales')).toBe('Q3/Sales.md');
        expect(relativePath(tree, 'home', 'sales')).toBe('Reports/Q3/Sales.md');
        expect(relativePath(tree, 'sales', 'home')).toBe('../../Home.md');
    });

    it('resolve back to the page, encoded or not, ignoring case', () => {
        expect(resolvePageLink(tree, 'sales', '../Train services.md')?.id).toBe('trains');
        expect(resolvePageLink(tree, 'sales', '../train%20Services.md')?.id).toBe('trains');
        expect(resolvePageLink(tree, 'home', 'Reports/Q3/Sales.md')?.id).toBe('sales');
        expect(resolvePageLink(tree, 'sales', '/Home.md')?.id).toBe('home');
    });

    it('resolve nothing for web addresses, missing pages and paths above the root', () => {
        expect(resolvePageLink(tree, 'home', 'https://example.org/Home.md')).toBeUndefined();
        expect(resolvePageLink(tree, 'home', 'Missing.md')).toBeUndefined();
        expect(resolvePageLink(tree, 'home', '../Home.md')).toBeUndefined();
    });
});

describe('page names', () => {
    it('must work as file names and be unique in their folder', () => {
        expect(pageNameError(tree, 'sales', 'Sales 2025')).toBeUndefined();
        expect(pageNameError(tree, 'sales', 'Sales/Q3')).toBeDefined();
        expect(pageNameError(tree, 'trains', 'q3')).toBeUndefined();
        expect(pageNameError([...tree, node('q3-2', 'folder', 'Other')], 'q3-2', 'reports')).toBe('"Reports" is already in this folder.');
        expect(pageNameError(tree, 'trains', 'TRAIN SERVICES')).toBeUndefined();
    });
});

describe('moving into a folder', () => {
    it('finds an item of the same kind and name there, ignoring case and the item itself', () => {
        const page = (id: string, name: string) => node(id, 'dashboards', name);
        expect(nameTakenInFolder(tree, ['reports'], page('home', 'train SERVICES'))?.id).toBe('trains');
        expect(nameTakenInFolder(tree, ['reports'], page('trains', 'Train services'))).toBeUndefined();
        expect(nameTakenInFolder(tree, [], page('other', 'home'))?.id).toBe('home');
        // A page named like a folder there is that folder's page, not a clash.
        expect(nameTakenInFolder(tree, ['reports'], page('home', 'Q3'))).toBeUndefined();
    });
});

describe('a folder\'s page', () => {
    const withPage = [...tree, node('reports-page', 'dashboards', 'reports')];

    it('is the page beside the folder with its name', () => {
        expect(folderPageOf(withPage, 'reports')?.id).toBe('reports-page');
        expect(pageFolderOf(withPage, 'reports-page')?.id).toBe('reports');
        expect(folderPageOf(tree, 'reports')).toBeUndefined();
        expect(pageFolderOf(withPage, 'home')).toBeUndefined();
    });

    it('may share the folder\'s name, but not another page\'s', () => {
        expect(pageNameError(tree, 'home', 'Reports')).toBeUndefined();
        expect(pageNameError(withPage, 'home', 'Reports')).toBe('"reports" is already in this folder.');
        expect(pageNameError(tree, 'q3', 'Train services')).toBeUndefined();
    });
});

describe('moving a folder or its page', () => {
    const withPage = [...tree, node('reports-page', 'dashboards', 'Reports')];

    it('moves the partner along', () => {
        const move = {type: 'move' as const, id_path: ['reports'], target_id_path: ['other']};
        expect(withPartnerMoves(withPage, [move])).toEqual([move, {...move, id_path: ['reports-page']}]);
    });

    it('moves only the page into its own folder, and anything without a partner alone', () => {
        const intoOwnFolder = {type: 'move' as const, id_path: ['reports-page'], target_id_path: ['reports']};
        expect(withPartnerMoves(withPage, [intoOwnFolder])).toEqual([intoOwnFolder]);
        const home = {type: 'move' as const, id_path: ['home'], target_id_path: ['reports']};
        expect(withPartnerMoves(withPage, [home])).toEqual([home]);
    });
});

describe('queries taken in', () => {
    const withQuery = [...tree, node('orders', 'relations', 'Orders')];

    it('are .sql paths relative to the page, like links', () => {
        expect(relativePath(withQuery, 'sales', 'orders')).toBe('../../Orders.sql');
        expect(resolveQueryInput(withQuery, 'sales', '../../orders.sql')?.id).toBe('orders');
        expect(resolveQueryInput(withQuery, 'sales', '../../Orders.md')).toBeUndefined();
        expect(resolvePageLink(withQuery, 'sales', '../../Orders.sql')).toBeUndefined();
    });
});
