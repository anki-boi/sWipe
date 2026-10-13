import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { SwipeMetadataData } from '../types/LocalStorageTypes';
import { metadataKey, parseScreenKeyType } from './StorageKeys';

class SwipeMetadata {
    readonly name: string;
    readonly type: SwipeScreenKeyType;
    lastAccessed = 0;
    // Items on the device plus items already deleted from this screen
    totalCount = 0;
    keepCount = 0;
    skipCount = 0;
    // Swiped left but not yet deleted from the device
    pendingDeleteCount = 0;
    deleteCount = 0;
    deletedMediaSize = 0;

    constructor(name: string, type: SwipeScreenKeyType) {
        this.name = name;
        this.type = type;
    }

    resetCounts(): void {
        this.lastAccessed = 0;
        this.totalCount = 0;
        this.keepCount = 0;
        this.skipCount = 0;
        this.pendingDeleteCount = 0;
        this.deleteCount = 0;
        this.deletedMediaSize = 0;
    }

    get key() {
        return metadataKey(this.type, this.name);
    }

    getProgress(): number {
        if (this.totalCount <= 0) {
            return 0;
        }
        const reviewed =
            this.deleteCount +
            this.keepCount +
            this.skipCount +
            this.pendingDeleteCount;
        return Math.min(1, reviewed / this.totalCount);
    }

    toData(): SwipeMetadataData {
        return {
            version: 2,
            name: this.name,
            type: this.type,
            lastAccessed: this.lastAccessed,
            totalCount: this.totalCount,
            keepCount: this.keepCount,
            skipCount: this.skipCount,
            pendingDeleteCount: this.pendingDeleteCount,
            deleteCount: this.deleteCount,
            deletedMediaSize: this.deletedMediaSize,
        };
    }

    serialize(): string {
        return JSON.stringify(this.toData());
    }

    async save(): Promise<void> {
        await AsyncStorage.setItem(this.key, this.serialize());
    }

    static fromData(data: Partial<SwipeMetadataData>): SwipeMetadata | null {
        const type = parseScreenKeyType(data.type);
        if (!type || typeof data.name !== 'string') {
            return null;
        }
        const metadata = new SwipeMetadata(data.name, type);
        metadata.lastAccessed = toNumber(data.lastAccessed);
        metadata.totalCount = toNumber(data.totalCount);
        metadata.keepCount = toNumber(data.keepCount);
        metadata.skipCount = toNumber(data.skipCount);
        metadata.pendingDeleteCount = toNumber(data.pendingDeleteCount);
        metadata.deleteCount = toNumber(data.deleteCount);
        metadata.deletedMediaSize = toNumber(data.deletedMediaSize);
        return metadata;
    }

    static deserialize(value: string | null): SwipeMetadata | null {
        if (!value) {
            return null;
        }
        try {
            return SwipeMetadata.fromData(JSON.parse(value));
        } catch (error) {
            console.error('Failed to parse swipe metadata:', error);
            return null;
        }
    }

    static async load(
        type: SwipeScreenKeyType,
        name: string
    ): Promise<SwipeMetadata | null> {
        try {
            return SwipeMetadata.deserialize(
                await AsyncStorage.getItem(metadataKey(type, name))
            );
        } catch (error) {
            console.error('Failed to load swipe metadata:', error);
            return null;
        }
    }
}

const toNumber = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;

export default SwipeMetadata;
