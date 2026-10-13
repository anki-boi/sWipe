import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';

jest.mock('expo-media-library', () => ({
    getAlbumsAsync: jest.fn(async () => [
        { id: 'album-1', title: 'Camera' },
        { id: 'album-2', title: 'Screenshots' },
    ]),
}));

// The store keeps module-level caches, so load a fresh copy per test.
const loadStore = () =>
    require('@/common/lib/localstorage/SwipeStore') as typeof import('@/common/lib/localstorage/SwipeStore');

const jan = new Date(2025, 0, 15).getTime();
const feb = new Date(2025, 1, 15).getTime();

beforeEach(async () => {
    jest.resetModules();
    await AsyncStorage.clear();
});

describe('SwipeStore', () => {
    it('returns the same session to concurrent callers', async () => {
        const store = loadStore();
        const [a, b] = await Promise.all([
            store.acquireSession(SwipeScreenKeyType.MONTH, 'January 2025'),
            store.acquireSession(SwipeScreenKeyType.MONTH, 'January 2025'),
        ]);
        expect(a.session).toBe(b.session);
    });

    it('credits deletes from a month to albums exactly once', async () => {
        const store = loadStore();
        await store.propagateDeletes(SwipeScreenKeyType.MONTH, [
            { uri: 'a', albumId: 'album-1', creationTime: jan, assetSize: 10 },
            { uri: 'b', albumId: 'album-1', creationTime: jan, assetSize: 20 },
            { uri: 'c', albumId: 'album-2', creationTime: jan, assetSize: 5 },
        ]);

        // Opening the album afterwards must not add the deletes again
        const { session: camera } = await store.acquireSession(
            SwipeScreenKeyType.ALBUM,
            'Camera'
        );
        camera.sync(['d']);
        expect(camera.metadata.deleteCount).toBe(2);
        expect(camera.metadata.deletedMediaSize).toBe(30);

        const albums = await store.getAllMetadata(SwipeScreenKeyType.ALBUM);
        expect(albums.get('Screenshots')?.deleteCount).toBe(1);
        expect(
            (await store.getAllMetadata(SwipeScreenKeyType.MONTH)).size
        ).toBe(0);
    });

    it('credits deletes from an album to the right months', async () => {
        const store = loadStore();
        await store.propagateDeletes(SwipeScreenKeyType.ALBUM, [
            { uri: 'a', albumId: 'album-1', creationTime: jan, assetSize: 1 },
            { uri: 'b', albumId: 'album-1', creationTime: feb, assetSize: 2 },
        ]);
        const months = await store.getAllMetadata(SwipeScreenKeyType.MONTH);
        expect(months.get('January 2025')?.deleteCount).toBe(1);
        expect(months.get('February 2025')?.deleteCount).toBe(1);
    });

    it('updates an open target session and drops its stale decisions', async () => {
        const store = loadStore();
        const { session: camera } = await store.acquireSession(
            SwipeScreenKeyType.ALBUM,
            'Camera'
        );
        camera.sync(['a', 'b']);
        camera.record('a', SwipeActionType.DELETE);

        await store.propagateDeletes(SwipeScreenKeyType.MONTH, [
            { uri: 'a', albumId: 'album-1', creationTime: jan, assetSize: 7 },
        ]);
        expect(camera.metadata.deleteCount).toBe(1);
        expect(camera.getPendingDeleteUris()).toEqual([]);
    });

    it('clearAllProgress removes saved state', async () => {
        const store = loadStore();
        const { session } = await store.acquireSession(
            SwipeScreenKeyType.MONTH,
            'January 2025'
        );
        session.sync(['a']);
        session.record('a', SwipeActionType.KEEP);
        await session.flush();
        const epoch = store.getResetEpoch();
        await store.clearAllProgress();
        expect(store.getResetEpoch()).toBe(epoch + 1);
        for (const metadata of (await store.getAllMetadata()).values()) {
            expect(metadata.keepCount).toBe(0);
            expect(metadata.lastAccessed).toBe(0);
        }

        // A screen still holding the session keeps working and saving
        expect(session.getDecision('a')).toBeUndefined();
        session.sync(['a']);
        session.record('a', SwipeActionType.DELETE);
        await session.flush();
        const months = await store.getAllMetadata(SwipeScreenKeyType.MONTH);
        expect(months.get('January 2025')?.pendingDeleteCount).toBe(1);
    });

    it('never evicts a session a screen is holding', async () => {
        const store = loadStore();
        const held = await store.acquireSession(
            SwipeScreenKeyType.ALBUM,
            'Camera'
        );
        for (let i = 0; i < 15; i++) {
            const other = await store.acquireSession(
                SwipeScreenKeyType.MONTH,
                `Month ${i}`
            );
            other.release();
        }
        const again = await store.acquireSession(
            SwipeScreenKeyType.ALBUM,
            'Camera'
        );
        expect(again.session).toBe(held.session);
    });
});
