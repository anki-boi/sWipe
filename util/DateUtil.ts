export const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

// Returns the 0-based month index, or -1 for an unknown name
export const getZeroIndexOfMonth = (month: string) =>
    MONTH_NAMES.indexOf(month);

export const getMonthNameFromOneBasedIndex = (index: number): string =>
    MONTH_NAMES[index - 1] ?? '';

export const getMonthNameFromZeroBasedIndex = (index: number): string =>
    MONTH_NAMES[index] ?? '';

export const convertDateToRelativeTimeString = (date: Date | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays < 1) return 'Today';
    if (diffInDays < 2) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
};
