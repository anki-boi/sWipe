import {
    metadataKey,
    parseMetadataKey,
    parseScreenKeyType,
} from '@/common/lib/localstorage/lib/StorageKeys';
import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';

describe('StorageKeys', () => {
    it.each([
        'January 2025',
        'My_Cool Album',
        'weird:name/with%chars',
        'Ünïcödé 📷',
    ])('round-trips %s', (name) => {
        const key = metadataKey(SwipeScreenKeyType.ALBUM, name);
        expect(parseMetadataKey(key)).toEqual({
            type: SwipeScreenKeyType.ALBUM,
            name,
        });
    });

    it('keeps months and albums with the same name apart', () => {
        expect(metadataKey(SwipeScreenKeyType.MONTH, 'x')).not.toEqual(
            metadataKey(SwipeScreenKeyType.ALBUM, 'x')
        );
    });

    it('ignores unrelated keys', () => {
        expect(parseMetadataKey('January_2025_metadata')).toBeNull();
        expect(parseMetadataKey('swipe:v2:Month:x:data')).toBeNull();
        expect(parseMetadataKey('swipe:v2:Nope:x:meta')).toBeNull();
    });

    it('parses route segments case-insensitively', () => {
        expect(parseScreenKeyType('Month')).toBe(SwipeScreenKeyType.MONTH);
        expect(parseScreenKeyType('album')).toBe(SwipeScreenKeyType.ALBUM);
        expect(parseScreenKeyType('swipe')).toBeNull();
        expect(parseScreenKeyType(undefined)).toBeNull();
    });
});
