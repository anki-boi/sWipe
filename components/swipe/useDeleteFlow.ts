import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AssetType } from '@/common/lib/localstorage/types/LocalStorageTypes';
import SwipeSession from '@/common/lib/localstorage/lib/SwipeSession';
import { propagateDeletes } from '@/common/lib/localstorage/SwipeStore';
import {
    deleteMedia,
    deleteNeedsInAppConfirmation,
} from '@/common/lib/swipeandroid/SwipeAndroidLibary';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import { getAssetSizes } from '@/util/ExpoFileUtil';
import { bytesToHumanReadable } from '@/util/MediaUtil';

/**
 * - deleted: items were removed from the device
 * - gone: every item was already missing, so nothing needed deleting
 * - cancelled: the user backed out
 * - failed: the delete did not happen (an alert was shown)
 */
export type DeleteOutcome = 'deleted' | 'gone' | 'cancelled' | 'failed';

export const confirmAsync = (
    title: string,
    message: string,
    confirmText: string
) =>
    new Promise<boolean>((resolve) =>
        Alert.alert(
            title,
            message,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
                {
                    text: confirmText,
                    style: 'destructive',
                    onPress: () => resolve(true),
                },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
        )
    );

/**
 * Deletes the given assets from the device and updates the session: looks up
 * sizes, drops items that are already gone, asks for confirmation on old
 * Android, deletes, records the stats and credits the other views.
 */
export function useDeleteFlow(
    session: SwipeSession | null,
    screenKeyType: SwipeScreenKeyType
) {
    const [isDeleting, setIsDeleting] = useState(false);
    const busy = useRef(false);

    const deleteAssets = useCallback(
        async (assets: AssetType[]): Promise<DeleteOutcome> => {
            if (!session || busy.current || assets.length === 0) {
                return 'cancelled';
            }
            busy.current = true;
            setIsDeleting(true);
            try {
                const sizes = await getAssetSizes(assets.map((a) => a.uri));
                // Items already gone from the device can't be deleted again
                const missing = assets.filter((_, i) => sizes[i] === null);
                const toDelete = assets
                    .map((asset, i) => ({ ...asset, assetSize: sizes[i] ?? 0 }))
                    .filter((_, i) => sizes[i] !== null);
                if (missing.length > 0) {
                    session.forget(missing.map((asset) => asset.uri));
                }
                if (toDelete.length === 0) {
                    return 'gone';
                }

                const totalSize = toDelete.reduce((t, a) => t + a.assetSize, 0);
                if (
                    deleteNeedsInAppConfirmation() &&
                    !(await confirmAsync(
                        'Delete media?',
                        `${toDelete.length} item(s) (${bytesToHumanReadable(totalSize)}) will be permanently deleted.`,
                        'Delete'
                    ))
                ) {
                    return 'cancelled';
                }

                const result = await deleteMedia(toDelete);
                if (result.status === 'deleted') {
                    session.markDeleted(
                        toDelete.map((asset) => asset.uri),
                        totalSize
                    );
                    await session.flush();
                    await propagateDeletes(screenKeyType, toDelete);
                    Alert.alert(
                        'Deleted',
                        `Deleted ${toDelete.length} item(s) and freed ${bytesToHumanReadable(totalSize)}.`
                    );
                    return 'deleted';
                }
                if (result.status === 'failed') {
                    Alert.alert('Could not delete', result.message);
                    return 'failed';
                }
                return 'cancelled';
            } catch (error) {
                console.error('Error deleting assets:', error);
                Alert.alert('Error', 'Failed to delete the selected media.');
                return 'failed';
            } finally {
                session.scheduleSave();
                busy.current = false;
                setIsDeleting(false);
            }
        },
        [session, screenKeyType]
    );

    return { deleteAssets, isDeleting };
}
