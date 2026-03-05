export type FractionalQuantityParseResult =
    | {
        ok: true;
        value: number;
        normalized: string;
    }
    | {
        ok: false;
        error: string;
    };

const FORMAT_ERROR = 'Enter decimal (0.5), fraction (1/6), or mixed (1 1/2).';
const POSITIVE_ERROR = 'Quantity must be greater than 0.';
const DENOMINATOR_ERROR = 'Denominator must be greater than 0.';

export function roundQuantity(value: number, places = 6): number {
    const factor = 10 ** places;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatQuantityPreview(value: number): string {
    return `= ${roundQuantity(value).toString()}`;
}

function parseUnsignedInteger(value: string): number | null {
    if (!/^\d+$/.test(value)) {
        return null;
    }
    return Number(value);
}

export function parseFractionalQuantity(input: string): FractionalQuantityParseResult {
    const raw = input.trim();

    if (!raw) {
        return { ok: false, error: FORMAT_ERROR };
    }

    // Mixed number: "1 1/2"
    const mixedMatch = raw.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixedMatch) {
        const whole = parseUnsignedInteger(mixedMatch[1]);
        const numerator = parseUnsignedInteger(mixedMatch[2]);
        const denominator = parseUnsignedInteger(mixedMatch[3]);

        if (whole === null || numerator === null || denominator === null) {
            return { ok: false, error: FORMAT_ERROR };
        }
        if (denominator <= 0) {
            return { ok: false, error: DENOMINATOR_ERROR };
        }

        const result = whole + numerator / denominator;
        if (!Number.isFinite(result) || result <= 0) {
            return { ok: false, error: POSITIVE_ERROR };
        }

        const rounded = roundQuantity(result);
        return {
            ok: true,
            value: rounded,
            normalized: rounded.toString(),
        };
    }

    // Simple fraction: "1/6"
    const fractionMatch = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
        const numerator = parseUnsignedInteger(fractionMatch[1]);
        const denominator = parseUnsignedInteger(fractionMatch[2]);

        if (numerator === null || denominator === null) {
            return { ok: false, error: FORMAT_ERROR };
        }
        if (denominator <= 0) {
            return { ok: false, error: DENOMINATOR_ERROR };
        }

        const result = numerator / denominator;
        if (!Number.isFinite(result) || result <= 0) {
            return { ok: false, error: POSITIVE_ERROR };
        }

        const rounded = roundQuantity(result);
        return {
            ok: true,
            value: rounded,
            normalized: rounded.toString(),
        };
    }

    // Decimal / integer number
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
        return { ok: false, error: FORMAT_ERROR };
    }
    if (parsed <= 0) {
        return { ok: false, error: POSITIVE_ERROR };
    }

    const rounded = roundQuantity(parsed);
    return {
        ok: true,
        value: rounded,
        normalized: rounded.toString(),
    };
}

/** Convert repeating decimals to fraction strings for display.
 *  Only converts when a very close fraction match exists (e.g. 0.333333 → "1/3").
 *  Clean decimals like 0.05 are returned as-is.
 */
export function decimalToFraction(value: number | string, maxDenominator = 12): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(num) || num <= 0) return String(value);

    const whole = Math.floor(num);
    const decimal = num - whole;

    // No fractional part — just return the integer
    if (decimal < 1e-6) return whole.toString();

    // Find best fraction match for the decimal part
    let bestNum = 1;
    let bestDen = 1;
    let bestErr = Infinity;

    for (let den = 2; den <= maxDenominator; den++) {
        const n = Math.round(decimal * den);
        if (n <= 0 || n >= den) continue;
        const err = Math.abs(decimal - n / den);
        if (err < bestErr) {
            bestErr = err;
            bestNum = n;
            bestDen = den;
        }
    }

    // Only use fraction if match is very tight (covers repeating decimals)
    // Otherwise return the original decimal value as-is
    if (bestErr > 1e-4) {
        return whole > 0 ? num.toString() : num.toString();
    }

    const fracStr = `${bestNum}/${bestDen}`;
    return whole > 0 ? `${whole} ${fracStr}` : fracStr;
}
