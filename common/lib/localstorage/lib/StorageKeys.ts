import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';

const PREFIX = 'swipe:v2';
const METADATA_SUFFIX = 'meta';
const DATA_SUFFIX = 'data';

// Names are URI-encoded so album names containing ':' or '_' round-trip exactly,
// and the screen type is part of the key so a month and an album can never collide.
const buildKey = (type: SwipeScreenKeyType, name: string, suffix: string) =>
    `${PREFIX}:${type}:${encodeURIComponent(name)}:${suffix}`;

export const metadataKey = (type: SwipeScreenKeyType, name: string) =>
    buildKey(type, name, METADATA_SUFFIX);

export const dataKey = (type: SwipeScreenKeyType, name: string) =>
    buildKey(type, name, DATA_SUFFIX);

export const isSwipeStorageKey = (key: string) => key.startsWith(`${PREFIX}:`);

export function parseMetadataKey(
    key: string
): { type: SwipeScreenKeyType; name: string } | null {
    const parts = key.split(':');
    if (
        parts.length !== 5 ||
        `${parts[0]}:${parts[1]}` !== PREFIX ||
        parts[4] !== METADATA_SUFFIX
    ) {
        return null;
    }
    const type = parseScreenKeyType(parts[2]);
    if (!type) {
        return null;
    }
    try {
        return { type, name: decodeURIComponent(parts[3]) };
    } catch {
        return null;
    }
}

export function parseScreenKeyType(
    value: string | undefined | null
): SwipeScreenKeyType | null {
    switch (value?.toLowerCase()) {
        case SwipeScreenKeyType.MONTH.toLowerCase():
            return SwipeScreenKeyType.MONTH;
        case SwipeScreenKeyType.ALBUM.toLowerCase():
            return SwipeScreenKeyType.ALBUM;
        default:
            return null;
    }
}
