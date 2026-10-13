import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SwipeActionType,
    SwipeScreenKeyType,
} from '@/common/types/SwipeMediaTypes';
import {
    ActionHistoryEntry,
    SwipeSessionData,
} from '../types/LocalStorageTypes';
import SwipeMetadata from './SwipeMetadata';
import { dataKey, metadataKey } from './StorageKeys';

const MAX_HISTORY = 200;
const SAVE_DELAY_MS = 750;

const SWIPE_ACTIONS = new Set<string>(Object.values(SwipeActionType));

/**
 * Swipe state for one month or album: the decision made for each item, an undo
 * history, and the summary metadata shown on the list screens.
 */
class SwipeSession {
    readonly metadata: SwipeMetadata;
    private decisions: Map<string, SwipeActionType>;
    private history: ActionHistoryEntry[];
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private saveChain: Promise<void> = Promise.resolve();
    private _revision = 0;

    constructor(
        metadata: SwipeMetadata,
        decisions: Map<string, SwipeActionType> = new Map(),
        history: ActionHistoryEntry[] = []
    ) {
        this.metadata = metadata;
        this.decisions = decisions;
        this.history = history;
    }

    /**
     * Increases on every change to decisions (not on sync). Screens remember the
     * value they last saw, so they can tell when another screen changed things.
     */
    get revision() {
        return this._revision;
    }

    get name() {
        return this.metadata.name;
    }

    get type() {
        return this.metadata.type;
    }

    getDecision(uri: string): SwipeActionType | undefined {
        return this.decisions.get(uri);
    }

    canUndo(): boolean {
        return this.history.length > 0;
    }

    /**
     * Reconciles stored state with the items currently on the device. Decisions
     * for items that no longer exist are dropped so counts can't drift.
     * Returns the index of the first item that hasn't been reviewed yet.
     */
    sync(uris: string[]): number {
        const present = new Set(uris);
        for (const uri of this.decisions.keys()) {
            if (!present.has(uri)) {
                this.decisions.delete(uri);
            }
        }
        this.history = this.history.filter(
            (entry) => present.has(entry.uri) && this.decisions.has(entry.uri)
        );
        this.metadata.totalCount = uris.length + this.metadata.deleteCount;
        this.metadata.lastAccessed = Date.now();
        this.recount();

        const firstUnreviewed = uris.findIndex(
            (uri) => !this.decisions.has(uri)
        );
        return firstUnreviewed === -1 ? uris.length : firstUnreviewed;
    }

    record(uri: string, action: SwipeActionType): void {
        const previous = this.decisions.get(uri);
        this.decisions.set(uri, action);
        // One undo entry per item, so re-swiping doesn't stack duplicates
        this.history = this.history.filter((entry) => entry.uri !== uri);
        this.history.push(
            previous ? { uri, action, previous } : { uri, action }
        );
        if (this.history.length > MAX_HISTORY) {
            this.history.splice(0, this.history.length - MAX_HISTORY);
        }
        this.recount();
        this._revision++;
    }

    /**
     * Changes the decision for an item without touching the undo order, e.g.
     * switching a marked item to Keep from the review screen.
     */
    setDecision(uri: string, action: SwipeActionType): void {
        this.decisions.set(uri, action);
        this.history = this.history.map((entry) =>
            entry.uri === uri ? { ...entry, action } : entry
        );
        this.recount();
        this._revision++;
    }

    /** Makes an item unreviewed again. */
    clearDecision(uri: string): void {
        this.forget([uri]);
    }

    undo(): ActionHistoryEntry | undefined {
        const entry = this.history.pop();
        if (entry) {
            if (entry.previous) {
                this.decisions.set(entry.uri, entry.previous);
            } else {
                this.decisions.delete(entry.uri);
            }
            this.recount();
            this._revision++;
        }
        return entry;
    }

    getPendingDeleteUris(): string[] {
        const uris: string[] = [];
        for (const [uri, action] of this.decisions) {
            if (action === SwipeActionType.DELETE) {
                uris.push(uri);
            }
        }
        return uris;
    }

    // Forget decisions for items that turned out to be gone from the device.
    forget(uris: string[]): void {
        const removed = new Set(uris);
        uris.forEach((uri) => this.decisions.delete(uri));
        this.history = this.history.filter((entry) => !removed.has(entry.uri));
        this.recount();
        this._revision++;
    }

    markDeleted(uris: string[], deletedMediaSize: number): void {
        this.forget(uris);
        this.addDeleted(uris.length, deletedMediaSize);
    }

    // Records items deleted from this screen or, via propagation, from another one.
    addDeleted(count: number, deletedMediaSize: number): void {
        this.metadata.deleteCount += count;
        this.metadata.deletedMediaSize += deletedMediaSize;
    }

    private recount(): void {
        let keep = 0;
        let skip = 0;
        let pendingDelete = 0;
        for (const action of this.decisions.values()) {
            if (action === SwipeActionType.KEEP) keep++;
            else if (action === SwipeActionType.SKIP) skip++;
            else if (action === SwipeActionType.DELETE) pendingDelete++;
        }
        this.metadata.keepCount = keep;
        this.metadata.skipCount = skip;
        this.metadata.pendingDeleteCount = pendingDelete;
    }

    toData(): SwipeSessionData {
        return {
            version: 2,
            decisions: Object.fromEntries(this.decisions),
            history: this.history,
        };
    }

    // Key/value pairs for AsyncStorage.multiSet
    storageEntries(): [string, string][] {
        return [
            [this.metadata.key, this.metadata.serialize()],
            [dataKey(this.type, this.name), JSON.stringify(this.toData())],
        ];
    }

    // Debounced save, so a burst of swipes results in a single write.
    scheduleSave(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = null;
            this.flush();
        }, SAVE_DELAY_MS);
    }

    /**
     * Writes metadata and decisions together. Saves are chained so an older
     * snapshot can never overwrite a newer one.
     */
    flush(): Promise<void> {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        const entries = this.storageEntries();
        this.saveChain = this.saveChain
            .then(() => AsyncStorage.multiSet(entries))
            .catch((error) => {
                console.error('Failed to save swipe session', this.name, error);
            });
        return this.saveChain;
    }

    // Forgets every decision and stat, e.g. after the user resets progress.
    reset(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        this.decisions.clear();
        this.history = [];
        this.metadata.resetCounts();
        this._revision++;
    }

    static async load(
        type: SwipeScreenKeyType,
        name: string
    ): Promise<SwipeSession> {
        const [[, metadataValue], [, dataValue]] = await AsyncStorage.multiGet([
            metadataKey(type, name),
            dataKey(type, name),
        ]);
        // Each part falls back on its own so a corrupt decision list never
        // wipes the counts, and vice versa.
        const metadata =
            SwipeMetadata.deserialize(metadataValue) ??
            new SwipeMetadata(name, type);
        const { decisions, history } = parseSessionData(dataValue);
        return new SwipeSession(metadata, decisions, history);
    }
}

export function parseSessionData(value: string | null): {
    decisions: Map<string, SwipeActionType>;
    history: ActionHistoryEntry[];
} {
    const decisions = new Map<string, SwipeActionType>();
    const history: ActionHistoryEntry[] = [];
    if (!value) {
        return { decisions, history };
    }
    try {
        const data = JSON.parse(value) as Partial<SwipeSessionData>;
        for (const [uri, action] of Object.entries(data.decisions ?? {})) {
            if (SWIPE_ACTIONS.has(action)) {
                decisions.set(uri, action);
            }
        }
        for (const entry of data.history ?? []) {
            if (
                typeof entry?.uri === 'string' &&
                SWIPE_ACTIONS.has(entry.action)
            ) {
                history.push({
                    uri: entry.uri,
                    action: entry.action,
                    ...(SWIPE_ACTIONS.has(entry.previous as string)
                        ? { previous: entry.previous }
                        : {}),
                });
            }
        }
    } catch (error) {
        console.error('Failed to parse swipe session data:', error);
    }
    return { decisions, history };
}

export default SwipeSession;
