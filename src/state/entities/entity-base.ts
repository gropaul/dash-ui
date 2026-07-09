/**
 * Shared usage metadata carried by every element that shows up in the folder view:
 * folders, relations, dashboards and canvases. All fields are optional so that
 * pre-existing persisted objects (which lack them) stay type-valid — missing
 * values are rendered as "—"/"Never"/0 and filled in as elements are viewed/edited.
 */
export interface EntityBase {
    id: string;
    lastEditedAt?: number; // ms epoch
    lastViewedAt?: number; // ms epoch
    nViews?: number;
}

/** Returns a shallow clone stamped with a view (increments the counter, bumps lastViewedAt). */
export function withViewed<T extends EntityBase>(entity: T, now: number = Date.now()): T {
    return {
        ...entity,
        lastViewedAt: now,
        nViews: (entity.nViews ?? 0) + 1,
    };
}
