/**
 * sagittal-Entry.js
 * Reverse Sagittal lookup for the Sagittal Entry window:
 * typed ASCII accidental + nominal letter + octave  →  exact JI monzo.
 *
 * Forward direction (sagittal-Calculator.js): pitch → alteration → key → symbol,
 * where each key's "default comma" (Commas sheet) is the exact ratio the symbol
 * stands for. This module inverts that: symbol → fullKey → comma ratio, so the
 * redeemed pitch is  nominal ± apotomes ± comma,  an exact rational.
 *
 * fullKey decomposition (mirrors the Calculator sheet's sharpFlatKeyShift):
 *   fullKey = commaKey + 1000 × apotomeShift,  commaKey ∈ [-148, 148],
 *   apotomeShift ∈ {-2,-1,0,1,2}  (bb, b, natural, #, x).
 *
 * Comma ratio reconstruction: the Commas sheet stores only name + cents
 * (e.g. key 44 = "1/5C", 21.5063¢). The name gives the 5-rough part of the
 * monzo (numerator primes positive, denominator primes negative); the 2,3
 * exponents are then recovered uniquely from the cents value, since
 * a + b·log2(3) = cents/1200 − log2(fiveRoughPart) has exactly one integer
 * solution (log2(3) is irrational).  key 44 → [-4, 4, -1] = 81/80. ✓
 */

import * as C from './constants.js';
import * as U from './utils.js';
import { COMMAS } from './sagittal-Commas.js';
import { KEY_SYMBOLS } from './sagittal-Key.js';
import { BOUNDARIES } from './sagittal-Boundaries.js';

const LOG2_3 = Math.log2(3);

// Factorize n over the app's primes ≥ 5; null if a factor > 89 remains.
function factorizeFiveRough(n) {
    const exps = {};
    let rest = n;
    for (const p of C.primes.slice(2)) {
        while (rest % p === 0) {
            exps[p] = (exps[p] || 0) + 1;
            rest /= p;
        }
    }
    return rest === 1 ? exps : null;
}

// Reconstruct the exact monzo of the comma for a (positive) comma key.
// The stored cents value is the authority (it is what the forward
// calculator's Error(¢) uses); the name supplies the 5-rough part. Two
// spreadsheet entries (66 "55/7C", 148 "25/77L") store cents for the
// inverse of the named orientation, so both orientations are tried.
function reconstructCommaMonzo(key) {
    const entry = COMMAS[key];
    if (!entry) return null;
    const m = entry.name.match(/^(\d+)(?:\/(\d+))?[unskCSML]$/);
    if (!m) return null;
    const numExps = factorizeFiveRough(parseInt(m[1], 10));
    const denExps = m[2] ? factorizeFiveRough(parseInt(m[2], 10)) : {};
    if (!numExps || !denExps) return null;

    for (const flip of [1, -1]) {
        const monzo = C.reference.slice();
        let residual = entry.cents / 1200; // = a + b·log2(3) + Σ e_p·log2(p)
        C.primes.forEach((p, i) => {
            if (i < 2) return; // skip 2 and 3 – solved for below
            const e = flip * ((numExps[p] || 0) - (denExps[p] || 0));
            monzo[i] = e;
            residual -= e * Math.log2(p);
        });
        for (let b = -60; b <= 60; b++) {
            const a = residual - b * LOG2_3;
            if (Math.abs(a - Math.round(a)) < 1e-7) {
                monzo[0] = Math.round(a);
                monzo[1] = b;
                return monzo;
            }
        }
    }
    return null;
}

// Precomputed comma monzos, keyed by positive comma key (0-148).
const COMMA_MONZOS = {};
for (const key of Object.keys(COMMAS)) {
    const monzo = reconstructCommaMonzo(Number(key));
    if (monzo) {
        COMMA_MONZOS[key] = monzo;
    } else {
        console.warn(`sagittal-Entry: cannot reconstruct comma for key ${key} ("${COMMAS[key].name}")`);
    }
}

// Comma keys available per precision level (the symbol subsets the
// Boundaries sheet actually assigns at that level).
const PRECISION_KEYS = {};
for (const [level, table] of Object.entries(BOUNDARIES)) {
    PRECISION_KEYS[level] = new Set(table.map(r => r.key));
}

function splitFullKey(fullKey) {
    const shift = 1000 * Math.round(fullKey / 1000);
    return { shift, key: fullKey - shift };
}

// ASCII string → fullKey maps, built lazily per mode('evo'|'revo') and
// precision ('medium'|'high'|'ultra'|'extreme'; 'all' = unfiltered).
const asciiMapCache = {};
function getAsciiMap(mode, precision) {
    const cacheKey = mode + ':' + precision;
    if (asciiMapCache[cacheKey]) return asciiMapCache[cacheKey];

    const field  = mode === 'evo' ? 'evo_ascii' : 'revo_ascii';
    const keySet = precision === 'all' ? null : PRECISION_KEYS[precision];
    const map = new Map();
    for (const fullKeyStr of Object.keys(KEY_SYMBOLS)) {
        const fullKey = Number(fullKeyStr);
        const { key } = splitFullKey(fullKey);
        if (keySet && key !== 0 && !keySet.has(Math.abs(key))) continue;
        if (key !== 0 && !COMMA_MONZOS[Math.abs(key)]) continue;
        const ascii = (KEY_SYMBOLS[fullKeyStr][field] || '').trim();
        if (!map.has(ascii)) map.set(ascii, fullKey);
    }
    asciiMapCache[cacheKey] = map;
    return map;
}

/**
 * Parse a typed ASCII sagittal accidental.
 * @returns {{fullKey: number, error: null} | {fullKey: null, error: string}}
 */
export function parseSagittalAscii(text, mode, precision) {
    const trimmed = (text || '').trim();
    if (trimmed === '') return { fullKey: 0, error: null };

    const hit = getAsciiMap(mode, precision).get(trimmed);
    if (hit !== undefined) return { fullKey: hit, error: null };

    if (getAsciiMap(mode, 'all').get(trimmed) !== undefined) {
        return { fullKey: null, error: 'symbol not in the selected precision set' };
    }
    if (getAsciiMap(mode === 'evo' ? 'revo' : 'evo', 'all').get(trimmed) !== undefined) {
        return { fullKey: null, error: `symbol is ${mode === 'evo' ? 'revo' : 'evo'}, not ${mode}` };
    }
    return { fullKey: null, error: 'unrecognized symbol' };
}

/**
 * Absolute monzo (app coordinates: all-zero = A4) of the entered note.
 * letterIndex/octaveIndex use the same dropdown value conventions as HEJI
 * Entry (C.notes / C.octave indices).
 */
export function sagittalEntryMonzo(letterIndex, octaveIndex, fullKey) {
    const { shift, key } = splitFullKey(fullKey);
    let monzo = U.sumArray(C.octave[octaveIndex], C.notes[letterIndex]);
    monzo = U.sumArray(monzo, C.chromatic[3 + shift / 1000]);
    if (key !== 0) {
        const cm = COMMA_MONZOS[Math.abs(key)];
        monzo = key > 0 ? U.sumArray(monzo, cm) : U.diffArray(monzo, cm);
    }
    return monzo;
}

/**
 * Read the Sagittal Entry window controls and return the absolute monzo of
 * the entered pitch. Falls back to the plain (natural) nominal when the
 * typed accidental is invalid, surfacing the problem in #sagittalEntryMessage.
 */
export function readSagittalEntry() {
    const precision   = $("#sagittalEntryTypeDropdown").val() || 'medium';
    const mode        = $("#sagittalEntryEvoToggle").hasClass("selected") ? 'evo' : 'revo';
    const letterIndex = parseInt($("#sagittalEntryNoteDropdown").val(), 10) || 0;
    const octaveIndex = parseInt($("#sagittalEntryOctaveDropdown").val(), 10) || 0;
    const text        = $("#sagittalEntryAccidentalInput").val();

    const parsed = parseSagittalAscii(text, mode, precision);
    $("#sagittalEntryMessage").text(parsed.error || '');

    return sagittalEntryMonzo(letterIndex, octaveIndex, parsed.fullKey ?? 0);
}
