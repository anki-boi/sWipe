import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAlbumsAsync } from 'expo-media-library';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getTimeBasedMonthKey } from '@/util/StringUtil';
import SwipeMetadata from './lib/SwipeMetadata';
import SwipeSession from './lib/SwipeSession';
import {
    isSwipeStorageKey,
    metadataKey,
    parseMetadataKey,
} from './lib/StorageKeys';
import { migrateLegacyStorage } from './lib/LegacyMigration';
import { clearDailyProgressCache } from '../goals/DailyProgress';

const MAX_CACHED_SESSIONS = 10;

// Insertion order doubles as LRU order: the most recently opened session is last.
const sessions = new Map<string, Promise<SwipeSession>>();
const loadedSessions = new Map<string, SwipeSession>();
// Sessions held by a mounted screen are never evicted, so there is only ever
// one live instance (and one writer) per month/album.
const retainCounts = new Map<string, number>();
let resetEpoch = 0;

let migration: Promise<void> | null = null;

function ensureMigrated(): Promise<void> {
    if (!migration) {
        migration = migrateLegacyStorage(async () =>
            (await getAlbumsAsync()).map((album) => album.title)
        );
    }
    return migration;
}

const cacheKey = (type: SwipeScreenKeyType, name: string) =>
    metadataKey(type, name);

/**
 * Returns the shared session for a month or album. Concurrent callers get the
 * same instance, so two screens can never write over each other.
 */
async function openSession(
    type: SwipeScreenKeyType,
    name: string
): Promise<SwipeSession> {
    await ensureMigrated();
    const key = cacheKey(type, name);
    let pending = sessions.get(key);
    if (pending) {
        sessions.delete(key);
    } else {
        pending = SwipeSession.load(type, name).then((session) => {
            loadedSessions.set(key, session);
            return session;
        });
        pending.catch(() => sessions.delete(key));
    }
    sessions.set(key, pending);
    evictLeastRecentlyUsed(key);
    return pending;
}

/**
 * Opens a session for a screen that keeps using it. Call the returned release
 * function when the screen unmounts.
 */
export async function acquireSession(
    type: SwipeScreenKeyType,
    name: string
): Promise<{ session: SwipeSession; release: () => void }> {
    const key = cacheKey(type, name);
    retainCounts.set(key, (retainCounts.get(key) ?? 0) + 1);
    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        const count = (retainCounts.get(key) ?? 1) - 1;
        if (count > 0) retainCounts.set(key, count);
        else retainCounts.delete(key);
    };
    try {
        return { session: await openSession(type, name), release };
    } catch (error) {
        release();
        throw error;
    }
}

function evictLeastRecentlyUsed(keepKey: string) {
    for (const key of sessions.keys()) {
        if (sessions.size <= MAX_CACHED_SESSIONS) {
            return;
        }
        if (key === keepKey || retainCounts.has(key)) {
            continue;
        }
        const session = loadedSessions.get(key);
        if (!session) {
            // Still loading; leave it for the next eviction pass.
            continue;
        }
        sessions.delete(key);
        loadedSessions.delete(key);
        session.flush();
    }
}

export async function flushAllSessions(): Promise<void> {
    await Promise.all([...loadedSessions.values()].map((s) => s.flush()));
}

/** Metadata for every month/album that has been opened, keyed by name. */
export async function getAllMetadata(
    type?: SwipeScreenKeyType
): Promise<Map<string, SwipeMetadata>> {
    await ensureMigrated();
    const result = new Map<string, SwipeMetadata>();
    try {
        const keys = (await AsyncStorage.getAllKeys()).filter(
            (key) =>
                isSwipeStorageKey(key) &&
                parseMetadataKey(key) !== null &&
                (!type || parseMetadataKey(key)!.type === type)
        );
        const values = await AsyncStorage.multiGet(keys);
        for (const [key, value] of values) {
            // An open session holds fresher numbers than what was last saved.
            const metadata =
                loadedSessions.get(key)?.metadata ??
                SwipeMetadata.deserialize(value);
            if (metadata) {
                result.set(metadata.name, metadata);
            }
        }
    } catch (error) {
        console.error('Failed to load swipe metadata:', error);
    }
    // Sessions opened but not saved yet
    for (const session of loadedSessions.values()) {
        if (!type || session.type === type) {
            result.set(session.name, session.metadata);
        }
    }
    return result;
}

export interface DeletedAsset {
    uri: string;
    albumId: string | undefined;
    creationTime: number;
    assetSize: number;
}

/**
 * After items are deleted from a month, the albums they belonged to get the
 * credit too (and vice versa), so the stats on both views stay correct.
 */
export async function propagateDeletes(
    sourceType: SwipeScreenKeyType,
    deleted: DeletedAsset[]
): Promise<void> {
    try {
        // Filter decks (e.g. Screenshots) credit both the months and albums
        const updates: Promise<void>[] = [];
        if (sourceType !== SwipeScreenKeyType.ALBUM) {
            updates.push(creditAlbums(deleted));
        }
        if (sourceType !== SwipeScreenKeyType.MONTH) {
            updates.push(creditMonths(deleted));
        }
        await Promise.all(updates);
    } catch (error) {
        console.error('Failed to propagate deletes:', error);
    }
}

async function creditAlbums(deleted: DeletedAsset[]) {
    const albumTitles = new Map(
        (await getAlbumsAsync()).map((album) => [album.id, album.title])
    );
    const groups = groupBy(deleted, (asset) =>
        asset.albumId ? albumTitles.get(asset.albumId) : undefined
    );
    await Promise.all(
        [...groups].map(([title, assets]) =>
            addDeletedTo(SwipeScreenKeyType.ALBUM, title, assets)
        )
    );
}

async function creditMonths(deleted: DeletedAsset[]) {
    const groups = groupBy(deleted, (asset) =>
        getTimeBasedMonthKey(asset.creationTime)
    );
    await Promise.all(
        [...groups].map(([month, assets]) =>
            addDeletedTo(SwipeScreenKeyType.MONTH, month, assets)
        )
    );
}

function groupBy<T>(items: T[], getKey: (item: T) => string | undefined) {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = getKey(item);
        if (key) groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return groups;
}

async function addDeletedTo(
    type: SwipeScreenKeyType,
    name: string,
    assets: DeletedAsset[]
) {
    const size = assets.reduce((total, asset) => total + asset.assetSize, 0);
    // Going through the shared session keeps a single writer per key and
    // drops any decisions the target still had for these items.
    const session = await openSession(type, name);
    session.markDeleted(
        assets.map((asset) => asset.uri),
        size
    );
    await session.flush();
}

/** Deletes all saved swipe progress and stats. */
export async function clearAllProgress(): Promise<void> {
    // Open sessions are reset in place, since mounted screens still hold them.
    loadedSessions.forEach((session) => session.reset());
    for (const key of sessions.keys()) {
        if (!loadedSessions.has(key)) sessions.delete(key);
    }
    const keys = (await AsyncStorage.getAllKeys()).filter(isSwipeStorageKey);
    await AsyncStorage.multiRemove(keys);
    clearDailyProgressCache();
    resetEpoch++;
}

// Changes every time progress is reset, so mounted screens know to reload.
export const getResetEpoch = () => resetEpoch;
