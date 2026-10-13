import * as FileSystem from 'expo-file-system';

// Size in bytes, or null if the file doesn't exist (e.g. it was deleted
// elsewhere). If the size can't be read, returns 0 rather than null so the
// file isn't mistaken for a missing one.
export async function getAssetSize(assetUri: string): Promise<number | null> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(assetUri);
        return fileInfo.exists ? fileInfo.size : null;
    } catch (error) {
        console.error('Error retrieving file info:', error);
        return 0;
    }
}

const ASSET_SIZE_CHUNK = 50;

export async function getAssetSizes(
    assetUris: string[]
): Promise<(number | null)[]> {
    const sizes: (number | null)[] = [];
    for (let i = 0; i < assetUris.length; i += ASSET_SIZE_CHUNK) {
        const chunk = assetUris.slice(i, i + ASSET_SIZE_CHUNK);
        sizes.push(...(await Promise.all(chunk.map(getAssetSize))));
    }
    return sizes;
}
