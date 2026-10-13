import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';
import { isMonthKey } from '@/util/StringUtil';
import SwipeMetadata from './SwipeMetadata';
import SwipeSession from './SwipeSession';

const MIGRATION_FLAG_KEY = 'swipe:migrated:v2';

const LEGACY_SUFFIXES = [
    '_metadata',
    '_trie',
    '_action_history',
    '_external_action_stack',
];

// Values of the old TrieEntryType enum
const LEGACY_TRIE_ACTIONS: Record<number, SwipeActionType> = {
    0: SwipeActionType.DELETE,
    1: SwipeActionType.KEEP,
    2: SwipeActionType.SKIP,
};

interface LegacyTrieNode {
    children?: Record<string, LegacyTrieNode>;
    isEndOfWord?: boolean;
    type?: number;
}

/** Walks the old per-character trie and returns uri -> action. */
export function collectLegacyTrieDecisions(
    root: LegacyTrieNode | undefined
): Map<string, SwipeActionType> {
    const decisions = new Map<string, SwipeActionType>();
    if (!root) {
        return decisions;
    }
    const stack: [LegacyTrieNode, string][] = [[root, '']];
    while (stack.length > 0) {
        const [node, prefix] = stack.pop()!;
        const action =
            node.type !== undefined
                ? LEGACY_TRIE_ACTIONS[node.type]
                : undefined;
        if (node.isEndOfWord && action) {
            decisions.set(prefix, action);
        }
        for (const [char, child] of Object.entries(node.children ?? {})) {
            stack.push([child, prefix + char]);
        }
    }
    return decisions;
}

/**
 * Old keys stored names with spaces replaced by '_', so the original name has
 * to be recovered: months match "Month YYYY", albums are matched against the
 * albums on the device.
 */
export function resolveLegacyName(
    storedName: string,
    albumTitles: string[]
): { type: SwipeScreenKeyType; name: string } {
    const spaced = storedName.replaceAll('_', ' ');
    if (isMonthKey(spaced)) {
        return { type: SwipeScreenKeyType.MONTH, name: spaced };
    }
    const album = albumTitles.find(
        (title) => title.replaceAll(' ', '_') === storedName
    );
    return { type: SwipeScreenKeyType.ALBUM, name: album ?? spaced };
}

/**
 * One-time move from the original storage format (four keys per screen and a
 * serialized trie) to the v2 format. Failures are logged and never block the
 * app; entries that could not be written are retried on the next launch.
 */
export async function migrateLegacyStorage(
    getAlbumTitles: () => Promise<string[]>
): Promise<void> {
    try {
        if (await AsyncStorage.getItem(MIGRATION_FLAG_KEY)) {
            return;
        }
        const keys = await AsyncStorage.getAllKeys();
        const legacyNames = keys
            .filter((key) => key.endsWith('_metadata') && !key.includes(':'))
            .map((key) => key.slice(0, -'_metadata'.length));

        let complete = true;
        if (legacyNames.length > 0) {
            // Needed to recover album names; without it, try again next launch.
            const albumTitles = await getAlbumTitles();
            const migrated: string[] = [];
            for (const storedName of legacyNames) {
                if (await migrateOne(storedName, albumTitles)) {
                    migrated.push(storedName);
                } else {
                    complete = false;
                }
            }
            await AsyncStorage.multiRemove(
                migrated.flatMap((name) =>
                    LEGACY_SUFFIXES.map((suffix) => name + suffix)
                )
            );
        }
        if (complete) {
            await AsyncStorage.setItem(MIGRATION_FLAG_KEY, String(Date.now()));
        }
    } catch (error) {
        console.error('Failed to migrate legacy swipe storage:', error);
    }
}

// Returns false if the entry should be retried later.
async function migrateOne(
    storedName: string,
    albumTitles: string[]
): Promise<boolean> {
    let session: SwipeSession;
    try {
        const [[, metadataValue], [, trieValue]] = await AsyncStorage.multiGet([
            `${storedName}_metadata`,
            `${storedName}_trie`,
        ]);
        const { type, name } = resolveLegacyName(storedName, albumTitles);
        const legacy = metadataValue ? JSON.parse(metadataValue) : {};
        const metadata = new SwipeMetadata(name, type);
        metadata.deleteCount = Number(legacy.deleteCount) || 0;
        metadata.deletedMediaSize = Number(legacy.deletedMediaSize) || 0;

        const decisions = trieValue
            ? collectLegacyTrieDecisions(JSON.parse(trieValue).root)
            : new Map<string, SwipeActionType>();

        session = new SwipeSession(metadata, decisions);
        // Counts are recomputed from the decisions; stale entries for already
        // deleted items are pruned the first time the screen is opened.
        session.sync([...decisions.keys()]);
        metadata.totalCount = Math.max(
            Number(legacy.initalCount) || 0,
            decisions.size + metadata.deleteCount
        );
        metadata.lastAccessed = Number(legacy.lastAccessed) || 0;
    } catch (error) {
        // Unreadable data can't be recovered by retrying; drop it.
        console.error('Dropping unreadable legacy entry', storedName, error);
        return true;
    }
    try {
        await AsyncStorage.multiSet(session.storageEntries());
        return true;
    } catch (error) {
        console.error('Failed to migrate legacy entry', storedName, error);
        return false;
    }
}
