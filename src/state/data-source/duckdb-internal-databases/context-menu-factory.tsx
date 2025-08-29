import {ReactNode} from "react";
import {ContextMenuItem, ContextMenuSeparator} from "@/components/ui/context-menu";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {Copy, Edit2, Trash} from 'lucide-react';
import {ConnectionsService} from "@/state/connections/connections-service";
import {quoteString} from "@/lib/utils";
import {useDataSourcesState} from "@/state/data-sources.state";
import {ResponsiveMenuItem, ResponsiveMenuSeparator} from "@/components/basics/responsive-menu/responsive-menu";

interface ContextMenuFactoryProps {
    tree_id_path: string[];
    tree: TreeNode;
    connection_id: string;
}


type Actions = 'copyName' | 'rename' | 'delete' ;
type ElementType = 'database' | 'schema' | 'table' | 'view' | 'column';

const ELEMENTS_FOR_COPY_NAME: ElementType[] = ['database', 'schema', 'table', 'view', 'column'];
const ELEMENTS_FOR_RENAME: ElementType[] = ['table', 'view', 'column'];
const ELEMENTS_FOR_DELETE: ElementType[] = ['table', 'view', 'column'];

export default function ContextMenuFactory(props: ContextMenuFactoryProps): ReactNode {

    function getFilePath(): string {
        const id_path = props.tree_id_path;
        return id_path[id_path.length - 1];
    }

    function getElementName(): string {
        // path to column: database.schema.table.column -> 4
        const quoted_path = props.tree_id_path.map(quoteString);
        if (props.tree_id_path.length < 4) {
            // quote the path elements
            return quoted_path.join('.');
        } else {
            return quoteString(props.tree.name);
        }
    }

    async function onCopyName() {
        try {
            const name = getElementName();
            await navigator.clipboard.writeText(name);
        } catch (err) {
            console.error('Failed to copy name:', err);
        }
    }


    async function renameElement() {
        const elementType = getElementType(props.tree);

        switch (elementType) {
            case 'table':
            case 'view': {
                const name = getElementName();
                const newName = prompt(`Rename ${elementType} ${name} to:`, name);
                if (newName) {
                    const quotedNewName = quoteString(newName);
                    const tableName = props.tree_id_path.map(quoteString).slice(0, 3).join('.');
                    const query = `
                        ALTER ${elementType.toUpperCase()} ${tableName} RENAME TO ${quotedNewName};`
                    await ConnectionsService.getInstance().executeQuery(query);
                    await useDataSourcesState.getState().loadAllDataSources(props.connection_id);
                }
                break;
            }
            case 'column': {
                const name = getElementName();
                const newName = prompt(`Rename column ${name} to:`, name);
                const tableName = props.tree_id_path.map(quoteString).slice(0, 3).join('.');
                if (newName) {
                    const quotedNewName = quoteString(newName);
                    const query = `
                        ALTER TABLE ${tableName} RENAME COLUMN ${name} TO ${quotedNewName};`
                    await ConnectionsService.getInstance().executeQuery(query);
                    await useDataSourcesState.getState().loadAllDataSources(props.connection_id);
                }
                break;
            }
        }
    }

    async function deleteElement() {
        const elementType = getElementType(props.tree);
        const confirmed = confirm(`Are you sure you want to delete this ${elementType}?`);
        if (!confirmed) {
            return;
        }
        if (elementType === 'column') {
            const columnName = getElementName();
            const tableName = props.tree_id_path.slice(0, 3).map(quoteString).join('.');
            const query = `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`;
            await ConnectionsService.getInstance().executeQuery(query);
            await useDataSourcesState.getState().loadAllDataSources(props.connection_id);

        } else {
            const tableName = getElementName();
            const query = `DROP ${elementType.toUpperCase()} ${tableName};`;
            await ConnectionsService.getInstance().executeQuery(query);
            await useDataSourcesState.getState().loadAllDataSources(props.connection_id);
        }
    }


    function getElementType(tree: TreeNode): ElementType {
        // it is database.schema.table.column
        const id_length = props.tree_id_path.length;
        if (id_length === 1) {
            return 'database';
        } else if (id_length === 2) {
            return 'schema';
        } else if (id_length === 3) {
            if (tree.type === 'relation') {
                return 'table';
            } else if (tree.type === 'view') {
                return 'view';
            } else {
                throw new Error(`Unknown element type for id path length: ${id_length} and tree type: ${tree.type}`);
            }
        } else if (id_length === 4) {
            return 'column';
        }

        throw new Error(`Unknown element type for id path length: ${id_length}`);
    }

    const elementType = getElementType(props.tree);

    return (
        <>
            {ELEMENTS_FOR_COPY_NAME.includes(elementType) && (
                <ResponsiveMenuItem onClick={onCopyName}>
                    <Copy size={16} style={{marginRight: 8}}/>
                    Copy Name
                </ResponsiveMenuItem>
            )}
            {ELEMENTS_FOR_RENAME.includes(elementType) && (
                <ResponsiveMenuItem onClick={renameElement}>
                    <Edit2 size={16} style={{marginRight: 8}}/>
                    Rename {elementType.charAt(0).toUpperCase() + elementType.slice(1)}
                </ResponsiveMenuItem>
            )}
            {ELEMENTS_FOR_DELETE.includes(elementType) && (
                <>
                    <ResponsiveMenuSeparator />
                    <ResponsiveMenuItem onClick={deleteElement} className="text-red-500">
                        <Trash size={16} style={{marginRight: 8}}/>
                        <span>Delete {elementType.charAt(0).toUpperCase() + elementType.slice(1)}</span>
                    </ResponsiveMenuItem>
                </>
            )}
            {/* Add more actions as needed */}
        </>
    );
}
