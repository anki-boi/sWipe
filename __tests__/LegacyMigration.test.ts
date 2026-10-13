import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collectLegacyTrieDecisions,
    migrateLegacyStorage,
    resolveLegacyName,
} from '@/common/lib/localstorage/lib/LegacyMigration';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';

// Builds a trie in the shape the old Trie class serialized
function legacyTrie(entries: Record<string, number>) {
    const root: any = { children: {}, isEndOfWord: false, type: 3 };
    for (const [word, type] of Object.entries(entries)) {
        let node = root;
        for (const char of word) {
            node.children[char] ??= {
                children: {},
                isEndOfWord: false,
                type: 3,
            };
            node = node.children[char];
        }
        node.isEndOfWord = true;
        node.type = type;
    }
    return { root, count: Object.keys(entries).length, name: 'x_trie' };
}

beforeEach(async () => {
    await AsyncStorage.clear();
});

describe('legacy migration', () => {
    it('collects words from the old trie', () => {
        const decisions = collectLegacyTrieDecisions(
            legacyTrie({ ab: 0, abc: 1, b: 2 }).root
        );
        expect(Object.fromEntries(decisions)).toEqual({
            ab: SwipeActionType.DELETE,
            abc: SwipeActionType.KEEP,
            b: SwipeActionType.SKIP,
        });
    });

    it('recovers month and album names', () => {
        expect(resolveLegacyName('January_2025', [])).toEqual({
            type: SwipeScreenKeyType.MONTH,
            name: 'January 2025',
        });
        expect(resolveLegacyName('My_Cool_Album', ['My_Cool Album'])).toEqual({
            type: SwipeScreenKeyType.ALBUM,
            name: 'My_Cool Album',
        });
    });

    it('moves old keys to the new format once', async () => {
        await AsyncStorage.multiSet([
            [
                'January_2025_metadata',
                JSON.stringify({
                    name: 'January 2025_metadata',
                    type: 'Album',
                    lastAccessed: 1000,
                    deleteCount: 4,
                    deletedMediaSize: 4096,
                    initalCount: 10,
                }),
            ],
            ['January_2025_trie', JSON.stringify(legacyTrie({ a: 1, b: 0 }))],
            ['January_2025_action_history', '{"name":"x","queue":[]}'],
            ['January_2025_external_action_stack', '{"name":"x","queue":[]}'],
        ]);

        await migrateLegacyStorage(async () => []);

        const keys = await AsyncStorage.getAllKeys();
        expect(keys.filter((k) => k.startsWith('January_2025'))).toEqual([]);

        const session = await SwipeSession.load(
            SwipeScreenKeyType.MONTH,
            'January 2025'
        );
        expect(session.metadata.deleteCount).toBe(4);
        expect(session.metadata.deletedMediaSize).toBe(4096);
        expect(session.metadata.lastAccessed).toBe(1000);
        expect(session.getDecision('a')).toBe(SwipeActionType.KEEP);
        expect(session.getDecision('b')).toBe(SwipeActionType.DELETE);

        // Second run is a no-op
        await AsyncStorage.setItem('Other_metadata', '{}');
        await migrateLegacyStorage(async () => []);
        expect(await AsyncStorage.getItem('Other_metadata')).toBe('{}');
    });

    it('keeps legacy data and retries when album names are unavailable', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        await AsyncStorage.setItem(
            'Camera_metadata',
            JSON.stringify({ deleteCount: 1 })
        );
        await migrateLegacyStorage(async () => {
            throw new Error('no permission yet');
        });
        expect(await AsyncStorage.getItem('Camera_metadata')).not.toBeNull();

        await migrateLegacyStorage(async () => ['Camera']);
        expect(await AsyncStorage.getItem('Camera_metadata')).toBeNull();
        const session = await SwipeSession.load(
            SwipeScreenKeyType.ALBUM,
            'Camera'
        );
        expect(session.metadata.deleteCount).toBe(1);
    });
});
