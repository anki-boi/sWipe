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
}

export enum SwipeActionType {
    DELETE = 'Delete',
    KEEP = 'Keep',
    SKIP = 'Skip',
}
