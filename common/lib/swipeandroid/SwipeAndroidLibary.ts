import { NativeModules, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { sortMediaData } from '../../../util/MediaUtil';
import { AlbumMediaData, MediaData } from '@/common/types/SwipeMediaTypes';
import { MediaSizeByCategory } from './types/SwipeAndroidLibraryTypes';

const { SwipeCustomMediaModule } = NativeModules;

export async function getImageCountByAlbumName(): Promise<AlbumMediaData[]> {
    try {
        const data = await SwipeCustomMediaModule.countImagesByAlbum();
        const albumMediaData: AlbumMediaData[] = Object.entries(data).map(
            ([key, value]) => {
                return {
                    album: key,
                    count: Number(value),
                };
            }
        );
        return albumMediaData;
    } catch (error) {
        console.error('Failed to get image count', error);
    }
    return [];
}

export async function getImageCountByMonthYear(): Promise<MediaData[]> {
    try {
        // one month ago
        const data = await SwipeCustomMediaModule.countImagesByMonthYear();

        // create a list of MediaData
        const mediaData: MediaData[] = Object.entries(data).map(
            ([key, value]) => {
                // convert it into format like "February 2024": 5 from "2024-02"
                const splited = key.split('-');
                const month = Number(splited[1]);
                const year = Number(splited[0]);
                return {
                    month,
                    year,
                    count: Number(value),
                };
            }
        );

        return sortMediaData(mediaData, 'monthyear', 'desc');
    } catch (error) {
        console.error('Failed to get image count', error);
    }
    return [];
}

export type DeleteResult =
    | { status: 'deleted' }
    | { status: 'cancelled' }
    | { status: 'failed'; message: string };

// Android 11+ shows its own system confirmation dialog for media deletes.
// Older versions delete immediately, so the caller must confirm first.
export const deleteNeedsInAppConfirmation = () =>
    Platform.OS !== 'android' || Number(Platform.Version) < 30;

const DELETE_ERROR_MESSAGES: Record<string, string> = {
    ERROR_UNRESOLVED_MEDIA:
        'Some items could not be found on the device. They may have been moved or deleted already.',
    ERROR_DELETE_IN_PROGRESS: 'Another delete is already in progress.',
};

/**
 * Deletes the given media files. On Android 11+ the system asks the user to
 * confirm; on older versions the files are deleted directly.
 */
export async function deleteMedia(
    assets: { id: string; uri: string }[]
): Promise<DeleteResult> {
    try {
        if (deleteNeedsInAppConfirmation()) {
            const deleted = await MediaLibrary.deleteAssetsAsync(
                assets.map((asset) => asset.id)
            );
            return deleted
                ? { status: 'deleted' }
                : {
                      status: 'failed',
                      message: 'The media could not be deleted.',
                  };
        }
        await SwipeCustomMediaModule.deletePhotos(
            assets.map((asset) => asset.uri)
        );
        return { status: 'deleted' };
    } catch (e) {
        const { code, message } = e as { code?: string; message?: string };
        if (code === 'ERROR_USER_REJECTED') {
            return { status: 'cancelled' };
        }
        console.error(`Error deleting media [${code}]:`, message);
        return {
            status: 'failed',
            message:
                (code && DELETE_ERROR_MESSAGES[code]) ??
                message ??
                'The media could not be deleted.',
        };
    }
}

export async function getMediaSizeByCategory(): Promise<MediaSizeByCategory> {
    try {
        const { images, videos, audio, gifs } =
            await SwipeCustomMediaModule.getMediaSizeByCategory();
        return { images, videos, audio, gifs };
    } catch (error) {
        console.error('Failed to get media size by category', error);
    }
    return { images: 0, videos: 0, audio: 0, gifs: 0 };
}
