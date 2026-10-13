import { SwipeActionType } from '@/common/types/SwipeMediaTypes';

export interface AssetType {
    id: string;
    index: number;
    uri: string;
    albumId: string | undefined;
    creationTime: number;
    // Size in bytes; 0 until it has been looked up (sizes are fetched lazily)
    assetSize: number;
    width: number;
    height: number;
    filename: string;
    mediaType: string;
}

export interface ActionHistoryEntry {
    uri: string;
    action: SwipeActionType;
}

// Persisted per-screen swipe decisions, stored separately from the metadata so
// list screens can read progress without loading every decision.
export interface SwipeSessionData {
    version: 2;
    decisions: Record<string, SwipeActionType>;
    history: ActionHistoryEntry[];
}

export interface SwipeMetadataData {
    version: 2;
    name: string;
    type: string;
    lastAccessed: number;
    totalCount: number;
    keepCount: number;
    skipCount: number;
    pendingDeleteCount: number;
    deleteCount: number;
    deletedMediaSize: number;
}
