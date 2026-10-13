import { getMonthNameFromZeroBasedIndex, MONTH_NAMES } from './DateUtil';

export function capitalizeFirstLetter(str: string | null | undefined): string {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// "Month YYYY" in device local time, matching the range getMediaByMonth queries.
export function getTimeBasedMonthKey(time: number): string {
    const date = new Date(time);
    return `${getMonthNameFromZeroBasedIndex(date.getMonth())} ${date.getFullYear()}`;
}

// Whether key has the "Month YYYY" form produced by getTimeBasedMonthKey
export function isMonthKey(key: string): boolean {
    const parts = key.split(' ');
    if (parts.length !== 2) {
        return false;
    }
    const [month, year] = parts;
    return MONTH_NAMES.includes(month) && /^\d{4}$/.test(year);
}
