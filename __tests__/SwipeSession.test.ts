import AsyncStorage from '@react-native-async-storage/async-storage';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';

const newSession = () =>
    new SwipeSession(
        new SwipeMetadata('January 2025', SwipeScreenKeyType.MONTH)
    );

beforeEach(async () => {
    await AsyncStorage.clear();
});

describe('SwipeSession', () => {
    it('returns the first unreviewed index from sync', () => {
        const session = newSession();
        expect(session.sync(['a', 'b', 'c'])).toBe(0);
        session.record('a', SwipeActionType.KEEP);
        session.record('b', SwipeActionType.DELETE);
        expect(session.sync(['a', 'b', 'c'])).toBe(2);
        session.record('c', SwipeActionType.SKIP);
        expect(session.sync(['a', 'b', 'c'])).toBe(3);
    });

    it('records the last item like any other', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.KEEP);
        session.record('b', SwipeActionType.DELETE);
        expect(session.getDecision('b')).toBe(SwipeActionType.DELETE);
        expect(session.getPendingDeleteUris()).toEqual(['b']);
        expect(session.metadata.getProgress()).toBe(1);
    });

    it('undo removes the decision and updates counts', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.KEEP);
        session.record('b', SwipeActionType.DELETE);
        expect(session.undo()).toEqual({
            uri: 'b',
            action: SwipeActionType.DELETE,
        });
        expect(session.getDecision('b')).toBeUndefined();
        expect(session.metadata.pendingDeleteCount).toBe(0);
        expect(session.metadata.keepCount).toBe(1);
        expect(session.undo()?.uri).toBe('a');
        expect(session.canUndo()).toBe(false);
        expect(session.undo()).toBeUndefined();
    });

    it('prunes decisions for items no longer on the device', () => {
        const session = newSession();
        session.sync(['a', 'b', 'c']);
        session.record('a', SwipeActionType.KEEP);
        session.record('b', SwipeActionType.KEEP);
        session.sync(['b', 'c']);
        expect(session.getDecision('a')).toBeUndefined();
        expect(session.metadata.keepCount).toBe(1);
        expect(session.metadata.totalCount).toBe(2);
        // History for the vanished item is gone too
        expect(session.undo()?.uri).toBe('b');
        expect(session.undo()).toBeUndefined();
    });

    it('markDeleted moves pending deletes into the deleted stats', () => {
        const session = newSession();
        session.sync(['a', 'b', 'c']);
        session.record('a', SwipeActionType.DELETE);
        session.record('b', SwipeActionType.DELETE);
        session.record('c', SwipeActionType.KEEP);
        session.markDeleted(['a', 'b'], 2048);
        expect(session.metadata.deleteCount).toBe(2);
        expect(session.metadata.deletedMediaSize).toBe(2048);
        expect(session.metadata.pendingDeleteCount).toBe(0);
        expect(session.getPendingDeleteUris()).toEqual([]);

        // After reload only 'c' is left; total still includes deleted items
        expect(session.sync(['c'])).toBe(1);
        expect(session.metadata.totalCount).toBe(3);
        expect(session.metadata.getProgress()).toBe(1);
    });

    it('caps the undo history', () => {
        const session = newSession();
        const uris = Array.from({ length: 250 }, (_, i) => `uri-${i}`);
        session.sync(uris);
        uris.forEach((uri) => session.record(uri, SwipeActionType.KEEP));
        expect(session.toData().history).toHaveLength(200);
        expect(session.metadata.keepCount).toBe(250);
    });

    it('round-trips through storage', async () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.DELETE);
        session.addDeleted(3, 100);
        await session.flush();

        const loaded = await SwipeSession.load(
            SwipeScreenKeyType.MONTH,
            'January 2025'
        );
        expect(loaded.getDecision('a')).toBe(SwipeActionType.DELETE);
        expect(loaded.metadata.deleteCount).toBe(3);
        expect(loaded.metadata.deletedMediaSize).toBe(100);
        expect(loaded.canUndo()).toBe(true);
    });

    it('keeps metadata when the decision data is corrupt', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const session = newSession();
        session.addDeleted(5, 500);
        await session.flush();
        await AsyncStorage.setItem(
            'swipe:v2:Month:January%202025:data',
            '{not json'
        );
        const loaded = await SwipeSession.load(
            SwipeScreenKeyType.MONTH,
            'January 2025'
        );
        expect(loaded.metadata.deleteCount).toBe(5);
        expect(loaded.getPendingDeleteUris()).toEqual([]);
    });

    it('reset forgets decisions and stats', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.DELETE);
        session.addDeleted(2, 10);
        session.reset();
        expect(session.canUndo()).toBe(false);
        expect(session.getPendingDeleteUris()).toEqual([]);
        expect(session.metadata.deleteCount).toBe(0);
        expect(session.metadata.getProgress()).toBe(0);
    });
});

describe('SwipeMetadata', () => {
    it('reports zero progress when nothing is known', () => {
        const metadata = new SwipeMetadata('x', SwipeScreenKeyType.ALBUM);
        expect(metadata.getProgress()).toBe(0);
    });

    it('never reports more than 100%', () => {
        const metadata = new SwipeMetadata('x', SwipeScreenKeyType.ALBUM);
        metadata.totalCount = 2;
        metadata.deleteCount = 3;
        expect(metadata.getProgress()).toBe(1);
    });
});
