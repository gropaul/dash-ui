import {Edge, MarkerType, Node} from '@xyflow/react';
import {RelationState} from "@/model/relation-state";
import {minifySQL} from "@/platform/sql-utils";
import {extractMacroRefs, sanitizeMacroName} from "@/state/relations/sql/table-macros";

/**
 * Extract node references from SQL.
 * Delegates to extractMacroRefs in table-macros.ts.
 */
export function extractNodeRefs(sql: string): string[] {
    return extractMacroRefs(sql);
}

/**
 * Find the node ID whose display name matches a given sanitized macro ref.
 * E.g. ref "employees" matches a node with displayName "Employees" because
 * sanitizeMacroName("Employees") === "employees".
 */
function findNodeIdByMacroRef(ref: string, allNodes: Node[], excludeNodeId: string): string | null {
    for (const node of allNodes) {
        if (node.id === excludeNodeId) continue;
        if (node.type !== 'relationNode') continue;
        const data = node.data as { relationData?: RelationState };
        const displayName = data?.relationData?.viewState?.displayName;
        if (displayName && sanitizeMacroName(displayName) === ref) {
            return node.id;
        }
    }
    return null;
}

/**
 * Compute which edges to add and which to remove based on SQL detection.
 * Only considers edges where the current node is the target (downstream).
 */
export function diffEdges(
    currentNodeId: string,
    detectedRefs: string[],
    currentEdges: Edge[],
    allNodes: Node[]
): { toAdd: { source: string; target: string }[]; toRemove: string[] } {
    // Map detected refs to source node IDs
    const detectedSourceIds = new Set<string>();
    for (const ref of detectedRefs) {
        const sourceId = findNodeIdByMacroRef(ref, allNodes, currentNodeId);
        if (sourceId) {
            detectedSourceIds.add(sourceId);
        }
    }

    // Current edges where this node is the target
    const existingIncoming = currentEdges.filter(e => e.target === currentNodeId);
    const existingSourceIds = new Set(existingIncoming.map(e => e.source));

    // Edges to add: detected but not yet existing
    const toAdd: { source: string; target: string }[] = [];
    for (const sourceId of detectedSourceIds) {
        if (!existingSourceIds.has(sourceId)) {
            toAdd.push({source: sourceId, target: currentNodeId});
        }
    }

    // Edges to remove: existing but no longer detected
    const toRemove: string[] = [];
    for (const edge of existingIncoming) {
        if (!detectedSourceIds.has(edge.source)) {
            toRemove.push(edge.id);
        }
    }

    return {toAdd, toRemove};
}

/**
 * Create a new edge with standard styling.
 */
export function createAutoEdge(source: string, target: string): Edge {
    return {
        id: `sql-ref-${source}-${target}`,
        source,
        target,
        type: 'floating',
        markerEnd: {
            type: MarkerType.Arrow,
            width: 30,
            height: 30,
        },
    };
}

/**
 * Inject a node macro reference into SQL.
 * Simple string-based approach — designed to be replaced with AST-based
 * SQL manipulation in a future iteration.
 */
export function injectNodeRef(currentSql: string, macroName: string): string {
    const trimmed = currentSql.trim();

    // check if the macro name is already present in the SQL to avoid duplicate injection
    const sqlWithoutComments = minifySQL(trimmed);
    if (new RegExp(`\\b${macroName}\\s*\\(`).test(sqlWithoutComments)) {
        return currentSql; // already present, no injection needed
    }

    // Empty SQL: generate a full SELECT
    if (!trimmed) {
        return `SELECT * FROM ${macroName}()`;
    }

    // Check if SQL already contains a FROM clause (case-insensitive)
    const fromMatch = trimmed.match(/\bFROM\b/i);
    if (!fromMatch) {
        // No FROM: append FROM clause
        return `${trimmed}\nFROM ${macroName}()`;
    }

    // Has FROM: append comma-separated (cross join)
    // Find the position after the last table reference in the FROM clause
    // Simple approach: insert after the FROM keyword's first table expression
    // We'll find "FROM <something>" and append ", macroName()"
    const fromIndex = trimmed.search(/\bFROM\b/i);
    const afterFrom = trimmed.substring(fromIndex);

    // Find the end of the FROM clause (before WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, UNION, etc.)
    const clauseEnd = afterFrom.search(/\b(WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|UNION|INTERSECT|EXCEPT)\b/i);

    if (clauseEnd === -1) {
        // No subsequent clause — append at end
        return `${trimmed}, ${macroName}()`;
    } else {
        // Insert before the next clause
        const insertPos = fromIndex + clauseEnd;
        return `${trimmed.substring(0, insertPos)}, ${macroName}() ${trimmed.substring(insertPos)}`;
    }
}
