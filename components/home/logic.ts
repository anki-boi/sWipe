import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';

export interface HomeTotals {
    freedBytes: number;
    deletedCount: number;
}

/**
 * Month metadata only: album and filter deletes are also credited to the
 * months they belong to, so adding every type would double count.
 */
export function computeTotals(metadata: Iterable<SwipeMetadata>): HomeTotals {
    let freedBytes = 0;
    let deletedCount = 0;
    for (const item of metadata) {
        if (item.type !== SwipeScreenKeyType.MONTH) continue;
        freedBytes += item.deletedMediaSize;
        deletedCount += item.deleteCount;
    }
    return { freedBytes, deletedCount };
}

/** The most recently opened session that is started but not finished. */
export function findContinueSession(
    metadata: Iterable<SwipeMetadata>
): SwipeMetadata | null {
    let best: SwipeMetadata | null = null;
    for (const item of metadata) {
        if (item.lastAccessed <= 0 || item.getProgress() >= 1) continue;
        if (!best || item.lastAccessed > best.lastAccessed) best = item;
    }
    return best;
}
