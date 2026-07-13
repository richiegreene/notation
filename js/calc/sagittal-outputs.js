import { sagittalBoundaries } from './sagittal-boundaries.js';

function isBoundaryEntry(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

export function getSagittalBoundaryEntry(steps, precision = 'medium') {
    const entries = sagittalBoundaries[precision] || [];
    if (!Array.isArray(entries) || entries.length === 0) {
        return null;
    }

    const numericEntries = entries.filter((entry) => isBoundaryEntry(entry) && Number.isFinite(Number(entry.steps)) && Number.isFinite(Number(entry.lowerBound)));
    if (numericEntries.length === 0) {
        return null;
    }

    const normalizedSteps = Number(steps);
    const precisionScale = {
        medium: 5.4,
        high: 1.1666666667,
        ultra: 0.8333333333,
        extreme: 0.2,
    }[precision] ?? 1;

    const targetStep = Math.max(0, Math.round(Math.abs(normalizedSteps) / precisionScale));

    let best = numericEntries[0];
    let bestDelta = Number.POSITIVE_INFINITY;

    for (const entry of numericEntries) {
        const stepValue = Number(entry.steps);
        const delta = Math.abs(targetStep - stepValue);
        if (delta < bestDelta) {
            best = entry;
            bestDelta = delta;
        }
    }

    return best;
}

export function formatSagittalOutput(steps, precision = 'medium') {
    const entry = getSagittalBoundaryEntry(steps, precision);
    if (!entry) {
        return { symbol: '', key: '', steps: steps, lowerBound: null };
    }

    return {
        symbol: entry.symbol || '',
        key: entry.key ?? '',
        steps: entry.steps,
        lowerBound: entry.lowerBound ?? null,
    };
}
