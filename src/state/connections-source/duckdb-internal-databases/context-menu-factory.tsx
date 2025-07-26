import {ReactNode} from "react";
import {ContextMenuItem} from "@/components/ui/context-menu";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {Copy, Edit2} from 'lucide-react';
import {ConnectionsService} from "@/state/connections-service";
import {quoteString} from "@/lib/utils";
import {useRelationsState} from "@/state/relations.state";
import {useSourceConState} from "@/state/connections-source.state";

interface ContextMenuFactoryProps {
    tree_id_path: string[];
    tree: TreeNode;
    connection_id: string;
}


type Actions = 'copyName' | 'rename' | 'delete' ;
type ElementType = 'database' | 'schema' | 'table' | 'view' | 'column';

const ELEMENTS_FOR_COPY_NAME: ElementType[] = ['database', 'schema', 'table', 'view', 'column'];
const ELEMENTS_FOR_RENAME: ElementType[] = ['table', 'view', 'column'];

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
                const query = `
                    ALTER ${elementType} ${name} RENAME TO ?; `
                const newName = prompt(`Rename ${elementType} to:`, name);
                if (newName) {
                    const quotedNewName = quoteString(newName);
                    await ConnectionsService.getInstance().executeQuery(query.replace('?', quotedNewName));
                    await useSourceConState.getState().loadAllDataSources(props.connection_id);
                }
            }
            case 'column': {

            }
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
            console.log(tree);
            if (tree.type === 'table') {
                return 'table';
            } else {
                return 'table';
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
                <ContextMenuItem onClick={onCopyName}>
                    <Copy size={16} style={{marginRight: 8}}/>
                    Copy Name
                </ContextMenuItem>
            )}
            {ELEMENTS_FOR_RENAME.includes(elementType) && (
                <ContextMenuItem onClick={renameElement}>
                    <Edit2 size={16} style={{marginRight: 8}}/>
                    Rename
                </ContextMenuItem>
            )}
            {/* Add more actions as needed */}
        </>
    );
}
