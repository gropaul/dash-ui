import {ReactNode} from "react";
import {ContextMenuItem} from "@/components/ui/context-menu";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {Copy} from 'lucide-react';
import {ConnectionsService} from "@/state/connections-service";

interface ContextMenuFactoryProps {
    tree_id_path: string[];
    tree: TreeNode;
    connection_id: string;
}

export default function ContextMenuFactory(props: ContextMenuFactoryProps): ReactNode {

    function getFilePath(): string {
        const id_path = props.tree_id_path;
        return id_path[id_path.length - 1];
    }

    async function onCopyContent() {
        try {
            const path = getFilePath();
            const query = `SELECT content
                           FROM read_text('${path}')`;
            const result = await ConnectionsService.getInstance().executeQuery(query);
            const content = result.rows[0][0];
            await navigator.clipboard.writeText(content);
        } catch (err) {
            console.error('Failed to copy content:', err);
        }
    }

    async function onCopyName() {
        try {
            const name = props.tree?.name || '';
            await navigator.clipboard.writeText(name);
        } catch (err) {
            console.error('Failed to copy name:', err);
        }
    }

    async function onCopyPath() {
        try {
            const path = getFilePath();
            await navigator.clipboard.writeText(path);
        } catch (err) {
            console.error('Failed to copy path:', err);
        }
    }

    return (
        <>
            <ContextMenuItem onClick={onCopyName}>
                <Copy size={16} style={{marginRight: 8}}/>
                Copy Name
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopyPath}>
                <Copy size={16} style={{opacity: 0, marginRight: 8}}/>
                Copy Path
            </ContextMenuItem>
            {props.tree.type === 'file' && (
                <ContextMenuItem onClick={onCopyContent}>
                    <Copy size={16} style={{opacity: 0,  marginRight: 8}}/>
                    Copy Content
                </ContextMenuItem>
            )}
            {props.tree.type === 'file' && (
                <>
                </>
            )}
        </>
    );
}
