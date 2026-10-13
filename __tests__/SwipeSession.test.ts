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

    it('setDecision switches a decision and keeps history in step', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.DELETE);
        session.record('b', SwipeActionType.KEEP);
        session.setDecision('a', SwipeActionType.KEEP);
        expect(session.getPendingDeleteUris()).toEqual([]);
        expect(session.metadata.keepCount).toBe(2);
        expect(session.metadata.pendingDeleteCount).toBe(0);
        session.undo();
        const entry = session.undo();
        expect(entry).toEqual({ uri: 'a', action: SwipeActionType.KEEP });
    });

    it('clearDecision makes an item unreviewed again', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.SKIP);
        session.clearDecision('a');
        expect(session.getDecision('a')).toBeUndefined();
        expect(session.sync(['a', 'b'])).toBe(0);
        expect(session.canUndo()).toBe(false);
    });

    it('bumps revision on changes but not on sync', () => {
        const session = newSession();
        session.sync(['a']);
        const start = session.revision;
        session.record('a', SwipeActionType.DELETE);
        const afterRecord = session.revision;
        expect(afterRecord).toBeGreaterThan(start);
        session.sync(['a']);
        expect(session.revision).toBe(afterRecord);
        session.setDecision('a', SwipeActionType.KEEP);
        expect(session.revision).toBeGreaterThan(afterRecord);
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

describe('re-swiping an item', () => {
    it('keeps one undo entry and restores the earlier decision', () => {
        const session = newSession();
        session.sync(['a', 'b']);
        session.record('a', SwipeActionType.DELETE);
        session.record('b', SwipeActionType.KEEP);
        // "Start over", then change a's decision
        session.record('a', SwipeActionType.KEEP);
        expect(session.toData().history.map((e) => e.uri)).toEqual(['b', 'a']);
        expect(session.metadata.pendingDeleteCount).toBe(0);

        const undone = session.undo();
        expect(undone?.previous).toBe(SwipeActionType.DELETE);
        expect(session.getDecision('a')).toBe(SwipeActionType.DELETE);
        expect(session.metadata.pendingDeleteCount).toBe(1);
    });

    it('persists the previous decision', async () => {
        const session = newSession();
        session.sync(['a']);
        session.record('a', SwipeActionType.SKIP);
        session.record('a', SwipeActionType.KEEP);
        await session.flush();
        const loaded = await SwipeSession.load(
            SwipeScreenKeyType.MONTH,
            'January 2025'
        );
        loaded.undo();
        expect(loaded.getDecision('a')).toBe(SwipeActionType.SKIP);
    });
});
