import * as MediaLibrary from 'expo-media-library';
import { getZeroIndexOfMonth } from './DateUtil';
import { MediaData } from '@/common/types/SwipeMediaTypes';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';

const PAGE_SIZE = 500;

type MediaPage = MediaLibrary.PagedInfo<MediaLibrary.Asset>;

// Fetches every page for the given options and returns them merged into one page.
async function getAllAssets(
    options: Omit<MediaLibrary.AssetsOptions, 'first' | 'after'>
): Promise<MediaPage> {
    const assets: MediaLibrary.Asset[] = [];
    let after: string | undefined = undefined;
    let page: MediaPage;
    do {
        page = await MediaLibrary.getAssetsAsync({
            ...options,
            first: PAGE_SIZE,
            after,
        });
        assets.push(...page.assets);
        after = page.endCursor;
    } while (page.hasNextPage);

    return {
        assets,
        endCursor: page.endCursor,
        hasNextPage: false,
        totalCount: page.totalCount,
    };
}

export async function getMediaByAlbum(albumName: string): Promise<MediaPage> {
    const album = await MediaLibrary.getAlbumAsync(albumName);

    if (!album) {
        return { assets: [], endCursor: '', hasNextPage: false, totalCount: 0 };
    }

    return getAllAssets({
        mediaType: ['photo', 'video'],
        sortBy: ['creationTime'],
        album: album,
    });
}

export async function getMediaByMonth(monthString: string): Promise<MediaPage> {
    const [monthName, year] = monthString.split(' ');
    // create object of month index manually
    const monthIndex = getZeroIndexOfMonth(monthName); // Get month index (0-based)
    if (monthIndex < 0 || !/^\d{4}$/.test(year ?? '')) {
        throw new Error(`Invalid month key: ${monthString}`);
    }
    const startDate = new Date(Number(year), monthIndex);
    const endDate = new Date(Number(year), monthIndex + 1); // First day of next month

    return getAllAssets({
        mediaType: ['photo', 'video'],
        sortBy: ['creationTime'],
        createdAfter: startDate,
        createdBefore: endDate,
    });
}

// sort list of media data

export const sortMediaData = (
    data: MediaData[],
    byParam: 'monthyear' | 'month' | 'year' | 'count',
    order: 'asc' | 'desc'
) => {
    return data.sort((a, b) => {
        if (byParam === 'monthyear') {
            if (order === 'asc') {
                return a.year - b.year || a.month - b.month;
            } else {
                return b.year - a.year || b.month - a.month;
            }
        }
        if (order === 'asc') {
            return a[byParam] - b[byParam];
        } else {
            return b[byParam] - a[byParam];
        }
    });
};

export function toAssetType(
    asset: MediaLibrary.Asset,
    index: number
): AssetType {
    return {
        id: asset.id,
        index,
        uri: asset.uri,
        albumId: asset.albumId,
        creationTime: asset.creationTime,
        assetSize: 0,
        width: asset.width,
        height: asset.height,
        filename: asset.filename,
        mediaType: asset.mediaType,
    };
}

export const bytesToHumanReadable = (bytes: number): string => {
    if (bytes === 0) return '0B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i];
};
