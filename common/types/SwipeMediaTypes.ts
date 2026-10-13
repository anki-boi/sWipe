import { AssetType } from '../lib/localstorage/types/LocalStorageTypes';

export interface AlbumMediaData {
    album: string;
    count: number;
}
export interface MediaData {
    month: number;
    year: number;
    count: number;
}

export interface SwipeComponentInputType {
    mediaAssets: AssetType[];
    swipeKey: string;
    screenKeyType: SwipeScreenKeyType;
    reloadAssets: () => Promise<void>;
}

export enum SwipeScreenKeyType {
    MONTH = 'Month',
    ALBUM = 'Album',
    // A smart filter such as "Screenshots"; the screen key is the filter id
    FILTER = 'Filter',
}

export enum SwipeActionType {
    DELETE = 'Delete',
    KEEP = 'Keep',
    SKIP = 'Skip',
}
