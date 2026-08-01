import {parseSourceEffect, SourceEffect, undoStatement} from "@/state/sources/source-effects";

/**
 * Ledger of what the open project's `sources.sql` did to the connection: filled while the manifest
 * is replayed, consumed when the project closes. One project is open at a time, so there is one.
 *
 * Session-scoped by design - a reload starts empty. Whatever a previous session left on a remote
 * server is out of reach anyway, and the replay is idempotent, so the state converges on next open.
 */
export class SourceSession {
    private static _instance: SourceSession | null = null;

    private effects: SourceEffect[] = [];

    static instance(): SourceSession {
        if (!SourceSession._instance) {
            SourceSession._instance = new SourceSession();
        }
        return SourceSession._instance;
    }

    /** Record a statement the manifest declared, whether or not it executed cleanly. */
    record(statement: string): void {
        const effect = parseSourceEffect(statement);
        if (effect) this.effects.push(effect);
    }

    /** The statements that undo this project's effects, newest first (a view before its database). */
    undoStatements(): string[] {
        return [...this.effects].reverse().map(undoStatement);
    }

    clear(): void {
        this.effects = [];
    }
}
