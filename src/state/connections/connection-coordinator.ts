// dbConnectionCoordinator.ts
// Plain TS (no React). Single-owner coordination per connection name.

import {DatabaseConnectionType} from "@/state/connections/configs";
import {conditionalLog} from "@/platform/conditional_log";

export type CoordinatorOptions = {
    handshakeMs?: number;      // wait for an existing owner to answer
    channelPrefix?: string;    // namespace per user/env
};

type Msg =
    | { type: "CLAIM"; id: string; ts: number }
    | { type: "RELEASE"; id: string; ts: number }
    | { type: "PLEASE_RELEASE"; id: string; ts: number; reason?: string }
    | { type: "RELEASED"; id: string; ts: number }
    | { type: "IS_THERE_AN_OWNER"; id: string; ts: number }
    | { type: "I_AM_THE_OWNER"; id: string; ts: number; ownerId: string | null };

export type Coordinator = {
    isOwner(): boolean;
    ownerId(): string | null;

    requestOwnership(): Promise<boolean>;
    releaseOwnership(): void;
    noteServerConflict(reason?: string): void;

    waitForRelease(): Promise<boolean>;

    // subscribe to ownership changes; returns unsubscribe
    subscribe(listener: (isOwner: boolean) => void): () => void;

    // cleanup when you’re done with this coordinator instance
    destroy(): void;
};

export function createConnectionCoordinator(
    connName: DatabaseConnectionType,
    log: boolean = false,
    opts: CoordinatorOptions = {},

): Coordinator {
    if (typeof window === "undefined") {
        throw new Error("Coordinator must run in the browser");
    }

    const { handshakeMs = 200, channelPrefix = "myapp" } = opts;

    // Scope keys by connection name
    const scope = `${channelPrefix}:db-conn:${connName}:v1`;
    const EVENT_KEY = `${scope}:event`;
    const SNAPSHOT_KEY = `${scope}:snapshot`;

    const tabId =
        (crypto as any)?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let _isOwner = false;
    let _ownerId: string | null = null;

    const listeners = new Set<(isOwner: boolean) => void>();
    const notify = () => {
        for (const l of listeners) l(_isOwner);
    };

    const bcSupported = "BroadcastChannel" in window;
    const bc = bcSupported ? new BroadcastChannel(scope) : null;

    const post = (m: Msg) => {
        if (bc) {
            bc.postMessage(m);
        } else {
            try {
                localStorage.setItem(EVENT_KEY, JSON.stringify(m));
            } catch {}
        }
    };

    const readSnapshot = () => {
        try {
            const raw = localStorage.getItem(SNAPSHOT_KEY);
            return raw ? (JSON.parse(raw) as { ownerId: string | null; ts: number }) : null;
        } catch {
            return null;
        }
    };

    const writeSnapshot = (owner: string | null) => {
        try {
            localStorage.setItem(
                SNAPSHOT_KEY,
                JSON.stringify({ ownerId: owner, ts: Date.now() })
            );
        } catch {}
    };

    const setOwnerLocal = (val: boolean, owner: string | null) => {
        _isOwner = val;
        _ownerId = owner;
        conditionalLog(log,`Tab ${tabId} isOwner=${_isOwner} ownerId=${_ownerId}`);
        notify();
    };

    const becomeOwner = () => {
        setOwnerLocal(true, tabId);
        writeSnapshot(tabId);
        post({ type: "CLAIM", id: tabId, ts: Date.now() });
    };

    const loseOwnership = () => {
        if (!_isOwner) return;
        setOwnerLocal(false, null);
        writeSnapshot(null);
        post({ type: "RELEASE", id: tabId, ts: Date.now() });
    };

    const handleMessage = (m: Msg) => {
        if (!m || typeof m !== "object") return;

        conditionalLog(log,`Tab ${tabId} received message`, m);

        switch (m.type) {
            case "CLAIM":
                if (m.id !== tabId) {
                    setOwnerLocal(false, m.id);
                    writeSnapshot(m.id);
                }
                break;

            case "RELEASE":
            case "RELEASED":
                if (m.id !== tabId) {
                    setOwnerLocal(false, null);
                    writeSnapshot(null);
                }
                // no-op for our state if we are not the one releasing
                break;

            case "PLEASE_RELEASE":
                if (_isOwner) {
                    // Caller must actually close the DB connection in their subscriber
                    setOwnerLocal(false, null);
                    writeSnapshot(null);
                    post({ type: "RELEASED", id: tabId, ts: Date.now() });
                }
                break;

            case "IS_THERE_AN_OWNER": {
                const snap = readSnapshot();
                conditionalLog(log,"Snapshot during handshake:", snap);
                // we are the owner, respond, else be silent
                if (_isOwner) {
                    conditionalLog(log,`Tab ${tabId} answering handshake as owner`);
                    const currentOwner = _isOwner ? tabId : snap?.ownerId ?? null;
                    post({type: "I_AM_THE_OWNER", id: tabId, ts: Date.now(), ownerId: currentOwner});
                } else {
                    conditionalLog(log,`Tab ${tabId} is not owner, staying silent`);
                }
            }

            case "I_AM_THE_OWNER":
                // handled ad hoc during handshake
                break;
        }
    };

    // wire listeners
    const onBc = (e: MessageEvent) => handleMessage(e.data as Msg);
    const onStorage = (e: StorageEvent) => {
        if (e.key === EVENT_KEY && e.newValue) {
            try {
                handleMessage(JSON.parse(e.newValue) as Msg);
            } catch {}
        }
    };
    if (bc) bc.addEventListener("message", onBc);
    if (!bc) window.addEventListener("storage", onStorage);

    // public API
    const requestOwnership = async (): Promise<boolean> => {
        conditionalLog(log,`Tab ${tabId} requesting ownership of ${connName}`);
        const snap = readSnapshot();
        conditionalLog(log,"Current snapshot:", snap);
        if (!snap || !snap.ownerId) {
            becomeOwner();
            conditionalLog(log,`Tab ${tabId} became owner immediately`);
            return true;
        }

        // Ask if an owner exists
        let gotPong = false;
        const handlePong = (m: Msg) => {
            if (m.type !== "I_AM_THE_OWNER") return;
            gotPong = true;
            if (!m.ownerId) {
                becomeOwner();
            } else {
                setOwnerLocal(false, m.ownerId);
            }
        };

        const tmpBc = (e: MessageEvent) => handlePong(e.data as Msg);
        const tmpStorage = (e: StorageEvent) => {
            if (e.key === EVENT_KEY && e.newValue) {
                try {
                    handlePong(JSON.parse(e.newValue) as Msg);
                } catch {}
            }
        };
        if (bc) bc.addEventListener("message", tmpBc);
        if (!bc) window.addEventListener("storage", tmpStorage);

        post({ type: "IS_THERE_AN_OWNER", id: tabId, ts: Date.now() });
        await new Promise((r) => setTimeout(r, handshakeMs));

        if (bc) bc.removeEventListener("message", tmpBc);
        if (!bc) window.removeEventListener("storage", tmpStorage);

        if (!gotPong) {
            becomeOwner();
            return true;
        }
        if (_isOwner) {
            conditionalLog(log,`Tab ${tabId} became owner after handshake`);
        } else {
            conditionalLog(log,`Tab ${tabId} did not become owner; owner is ${_ownerId}`);
        }
        return _isOwner;
    };

    const releaseOwnership = () => {
        if (!_isOwner) return;
        setOwnerLocal(false, null);
        writeSnapshot(null);
        post({ type: "RELEASED", id: tabId, ts: Date.now() });
    };

    const waiters: Array<(released: boolean) => void> = [];
    const waitForRelease = () =>
        new Promise<boolean>((resolve) => {
            waiters.push(resolve);
        });

    // resolve waiters whenever someone releases
    const releaseWatcher = (e: MessageEvent | StorageEvent) => {
        const storageVal = (e as StorageEvent).newValue;
        const data =
            (e as MessageEvent).data ??
            (storageVal ? JSON.parse(storageVal) : null);


        if (data && (data.type === "RELEASED" || data.type === "RELEASE")) {
            const ws = waiters.splice(0);
            ws.forEach((w) => w(true));
        }
    };
    if (bc) bc.addEventListener("message", releaseWatcher);
    if (!bc) window.addEventListener("storage", releaseWatcher as any);

    const noteServerConflict = (reason = "already_in_use") => {
        post({ type: "PLEASE_RELEASE", id: tabId, ts: Date.now(), reason });
    };

    const subscribe = (listener: (isOwner: boolean) => void) => {
        listeners.add(listener);
        // immediate call with current state
        listener(_isOwner);
        return () => listeners.delete(listener);
    };

    const destroy = () => {
        if (bc) {
            bc.removeEventListener("message", onBc);
            bc.removeEventListener("message", releaseWatcher);
            bc.close();
        } else {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("storage", releaseWatcher as any);
        }
        listeners.clear();
    };

    return {
        isOwner: () => _isOwner,
        ownerId: () => _ownerId,

        requestOwnership,
        releaseOwnership,
        noteServerConflict,

        waitForRelease,

        subscribe,
        destroy,
    };
}
