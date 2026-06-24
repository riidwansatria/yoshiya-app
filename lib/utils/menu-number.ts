const CIRCLED_NUMBERS = [
    ...Array.from({ length: 20 }, (_, index) => String.fromCodePoint(0x2460 + index)),
    ...Array.from({ length: 15 }, (_, index) => String.fromCodePoint(0x3251 + index)),
    ...Array.from({ length: 15 }, (_, index) => String.fromCodePoint(0x32b1 + index)),
];

const CIRCLED_NUMBER_INDEX = new Map(
    CIRCLED_NUMBERS.map((character, index) => [character, index + 1])
);

export function menuNumberIndex(name: string) {
    const circled = CIRCLED_NUMBER_INDEX.get(name[0]);
    if (circled !== undefined) return circled;

    const match = name.normalize('NFKC').match(/^(\d+)\s*(?:[|｜]\s*)?/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

const MENU_NAME_COLLATOR = new Intl.Collator('ja', {
    numeric: true,
    sensitivity: 'base',
});

export function compareMenuNames(
    left: Pick<{ name: string }, 'name'>,
    right: Pick<{ name: string }, 'name'>
) {
    const numberDifference = menuNumberIndex(left.name) - menuNumberIndex(right.name);
    if (Number.isFinite(numberDifference) && numberDifference !== 0) {
        return numberDifference;
    }
    if (menuNumberIndex(left.name) !== menuNumberIndex(right.name)) {
        return Number.isFinite(menuNumberIndex(left.name)) ? -1 : 1;
    }
    return MENU_NAME_COLLATOR.compare(left.name.normalize('NFKC'), right.name.normalize('NFKC'));
}
