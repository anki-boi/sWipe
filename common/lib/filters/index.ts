import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import {
    getAllAssets,
    getMediaByAlbum,
    getMediaByMonth,
} from '@/util/MediaUtil';

const MEDIA_TYPES: MediaLibrary.MediaTypeValue[] = ['photo', 'video'];
const LONG_VIDEO_SECONDS = 30;
const MAX_FILTER_ITEMS = 300;

export interface SmartFilter {
    id: string;
    title: string;
    description: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    load: () => Promise<MediaLibrary.Asset[]>;
}

const newestFirst = (a: MediaLibrary.Asset, b: MediaLibrary.Asset) =>
    b.creationTime - a.creationTime;

async function loadScreenshots(): Promise<MediaLibrary.Asset[]> {
    const albums = (await MediaLibrary.getAlbumsAsync()).filter((album) =>
        /screen ?shots?/i.test(album.title)
    );
    const pages = await Promise.all(
        albums.map((album) =>
            getAllAssets({
                mediaType: MEDIA_TYPES,
                album,
                sortBy: ['creationTime'],
            })
        )
    );
    return pages.flatMap((page) => page.assets).sort(newestFirst);
}

async function loadLongVideos(): Promise<MediaLibrary.Asset[]> {
    const page = await getAllAssets({
        mediaType: ['video'],
        sortBy: [['duration', false]],
    });
    return page.assets
        .filter((asset) => asset.duration >= LONG_VIDEO_SECONDS)
        .slice(0, MAX_FILTER_ITEMS);
}

async function loadOldest(): Promise<MediaLibrary.Asset[]> {
    const page = await MediaLibrary.getAssetsAsync({
        mediaType: MEDIA_TYPES,
        sortBy: [['creationTime', true]],
        first: MAX_FILTER_ITEMS,
    });
    return page.assets;
}

async function loadOnThisDay(now: Date = new Date()) {
    const firstYear = 2000;
    const queries: Promise<MediaLibrary.PagedInfo<MediaLibrary.Asset>>[] = [];
    for (let year = now.getFullYear() - 1; year >= firstYear; year--) {
        const start = new Date(year, now.getMonth(), now.getDate());
        // Skip Feb 29 in non-leap years (Date rolls it over to March 1)
        if (start.getMonth() !== now.getMonth()) continue;
        queries.push(
            getAllAssets({
                mediaType: MEDIA_TYPES,
                sortBy: ['creationTime'],
                createdAfter: start,
                createdBefore: new Date(
                    year,
                    now.getMonth(),
                    now.getDate() + 1
                ),
            })
        );
    }
    const pages = await Promise.all(queries);
    return pages.flatMap((page) => page.assets).sort(newestFirst);
}

export const SMART_FILTERS: SmartFilter[] = [
    {
        id: 'screenshots',
        title: 'Screenshots',
        description: 'Clear out old screenshots',
        icon: 'screenshot',
        load: loadScreenshots,
    },
    {
        id: 'long-videos',
        title: 'Long videos',
        description: `Videos over ${LONG_VIDEO_SECONDS}s, longest first`,
        icon: 'video-library',
        load: loadLongVideos,
    },
    {
        id: 'on-this-day',
        title: 'On this day',
        description: 'Taken on this date in past years',
        icon: 'history',
        load: () => loadOnThisDay(),
    },
    {
        id: 'oldest',
        title: 'Oldest first',
        description: `Your ${MAX_FILTER_ITEMS} oldest photos and videos`,
        icon: 'hourglass-bottom',
        load: loadOldest,
    },
];

export const getSmartFilter = (id: string) =>
    SMART_FILTERS.find((filter) => filter.id === id);

/** Human-readable name for a month, album or filter screen. */
export function getScreenTitle(type: SwipeScreenKeyType, key: string): string {
    return type === SwipeScreenKeyType.FILTER
        ? (getSmartFilter(key)?.title ?? key)
        : key;
}

/** Loads the media shown in a swipe deck. */
export async function loadScreenMedia(
    type: SwipeScreenKeyType,
    key: string
): Promise<MediaLibrary.Asset[]> {
    switch (type) {
        case SwipeScreenKeyType.MONTH:
            return (await getMediaByMonth(key)).assets;
        case SwipeScreenKeyType.ALBUM:
            return (await getMediaByAlbum(key)).assets;
        case SwipeScreenKeyType.FILTER: {
            const filter = getSmartFilter(key);
            if (!filter) throw new Error(`Unknown filter: ${key}`);
            return filter.load();
        }
    }
}
