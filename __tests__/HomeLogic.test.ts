import { SwipeScreenKeyType } from '@/common/types/SwipeMediaTypes';
import SwipeMetadata from '@/common/lib/localstorage/lib/SwipeMetadata';
import { computeTotals, findContinueSession } from '@/components/home/logic';

const make = (
    type: SwipeScreenKeyType,
    name: string,
    values: Partial<SwipeMetadata>
) => Object.assign(new SwipeMetadata(name, type), values);

describe('computeTotals', () => {
    it('only counts months', () => {
        const totals = computeTotals([
            make(SwipeScreenKeyType.MONTH, 'Jan', {
                deleteCount: 3,
                deletedMediaSize: 300,
            }),
            make(SwipeScreenKeyType.ALBUM, 'Camera', {
                deleteCount: 3,
                deletedMediaSize: 300,
            }),
            make(SwipeScreenKeyType.FILTER, 'screenshots', {
                deleteCount: 1,
                deletedMediaSize: 10,
            }),
        ]);
        expect(totals).toEqual({ freedBytes: 300, deletedCount: 3 });
    });
});

describe('findContinueSession', () => {
    it('picks the latest unfinished session', () => {
        const old = make(SwipeScreenKeyType.MONTH, 'Jan', {
            totalCount: 10,
            keepCount: 5,
            lastAccessed: 1,
        });
        const recent = make(SwipeScreenKeyType.ALBUM, 'Camera', {
            totalCount: 10,
            keepCount: 2,
            lastAccessed: 5,
        });
        const done = make(SwipeScreenKeyType.FILTER, 'oldest', {
            totalCount: 10,
            keepCount: 10,
            lastAccessed: 9,
        });
        const untouched = make(SwipeScreenKeyType.MONTH, 'Feb', {
            totalCount: 10,
        });
        expect(findContinueSession([old, recent, done, untouched])).toBe(
            recent
        );
        expect(findContinueSession([done, untouched])).toBeNull();
    });
});
