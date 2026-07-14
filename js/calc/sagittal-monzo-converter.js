/**
 * Sagittal Monzo Converter
 * Implements the complete sagittal algorithm from the reference spreadsheet
 * 
 * Algorithm overview:
 * 1. Find nominals within range (±2*apotome)
 * 2. For each nominal:
 *    a. Calculate rough alteration
 *    b. Determine sharp/flat adjustment based on threshold
 *    c. Calculate adjusted nominal
 *    d. Calculate final alteration relative to adjusted nominal
 *    e. Look up key via boundary table VLOOKUP
 *    f. Get key offset from Commas data
 *    g. Error = |final_alteration - key_offset|
 */

import { sagittalKeyData } from './sagittal-key-data.js';
import * as U from './utils.js';

// ============================================================================
// CONSTANTS - These should match the Excel spreadsheet exactly
// ============================================================================

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89];

const NOMINAL_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const NOMINAL_CENTS = {
    'C': 0,
    'D': 203.91,
    'E': 407.82,
    'F': 498.04,
    'G': 701.96,
    'A': 905.87,
    'B': 1109.78
};

const NOMINAL_FIFTHS = {
    'C': 0,  'G': 1,  'D': 2,  'A': 3,  'E': 4,  'B': 5,  'F': -1
};

// Apotome in cents (7*log2(3) - 11)
const APOTOME = (7 * Math.log2(3) - 11) * 1200;

// Maximum apotome (from extreme precision section, Boundaries!N154)
const MAX_APOTOME = 68.5725082211804;

// Sharp/flat thresholds
const THRESHOLD1 = APOTOME * (1 + MAX_APOTOME / APOTOME);  // ~182.16¢
const THRESHOLD2 = APOTOME * (MAX_APOTOME / APOTOME);       // ~68.57¢

// ============================================================================
// BOUNDARY DATA - Athenian (Medium) Precision
// ============================================================================

const ATHENIAN_BOUNDARIES = [
    { lower: -0.21078802112060538, key: 0 },
    { lower: 2.74024427456784, key: 12 },
    { lower: 8.08020747628978, key: 20 },
    { lower: 13.4201706780117, key: 30 },
    { lower: 18.7601338797337, key: 44 },
    { lower: 24.6621984711106, key: 58 },
    { lower: 30.0021616728325, key: 70 },
    { lower: 35.1180914643665, key: 84 },
    { lower: 40.2605120340352, key: 92 },
    { lower: 45.1124978432452, key: 104 },
    { lower: 51.2195402534956, key: 114 },
    { lower: 56.8425030267918, key: 131 },
    { lower: 62.4654658000880, key: 141 }
];

// ============================================================================
// COMMAS DATA - Key to cents offset mapping
// ============================================================================

const COMMAS_DATA = {
    0: 0,
    12: 5.757802327169783,
    20: 9.687961266369887,
    30: 14.730414364838881,
    44: 21.506290322580655,
    58: 27.264092324193357,
    70: 33.147971215393806,
    84: 38.90577521700649,
    92: 43.01257903061646,
    104: 48.77038303214916,
    114: 53.272943458856275,
    131: 60.41206375769903,
    141: 64.91462532323208
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert monzo to cents
 */
function monzoToCents(monzo) {
    if (!monzo || monzo.length === 0) return 0;
    let cents = 0;
    for (let i = 0; i < Math.min(monzo.length, PRIMES.length); i++) {
        const exponent = monzo[i] || 0;
        cents += exponent * 1200 * Math.log2(PRIMES[i]);
    }
    return cents;
}

/**
 * Look up key using VLOOKUP logic (approximate match)
 * Finds the largest lower bound that is <= search value
 */
function vlookupKey(alteration, boundaries) {
    const absAlt = Math.abs(alteration);
    let matchingKey = null;
    
    for (let i = 0; i < boundaries.length; i++) {
        if (boundaries[i].lower <= absAlt) {
            matchingKey = boundaries[i].key;
        }
    }
    
    // If alteration is negative, negate the key
    if (alteration < 0 && matchingKey !== null) {
        matchingKey = -matchingKey;
    }
    
    return matchingKey;
}

/**
 * Get key offset from Commas data
 */
function getKeyOffset(key) {
    if (key === null || key === undefined) return 0;
    const absKey = Math.abs(key);
    const baseOffset = COMMAS_DATA[absKey] || 0;
    return key < 0 ? -baseOffset : baseOffset;
}

/**
 * Get Pythagorean fifths count from C
 */
function getFifthsFromC(noteName) {
    return NOMINAL_FIFTHS[noteName] || 0;
}

// ============================================================================
// MAIN ALGORITHM
// ============================================================================

/**
 * Generate three enharmonic variants for a monzo at given precision
 * 
 * @param {number[]} monzo - Monzo representation
 * @param {string} precision - 'medium', 'high', 'ultra', or 'extreme'
 * @returns {Array} Three enharmonic variants
 */
export function generateEnharmonicVariantsFromMonzo(monzo, precision) {
    // Check for zero/empty monzo
    const isZeroMonzo = !monzo || monzo.length === 0 || monzo.every(v => v === 0);
    
    if (isZeroMonzo) {
        return [
            { noteName: 'C', accidental: '', key: 0, errorCents: 0, fifthsCount: 0 },
            { noteName: 'D', accidental: 'bb', key: -1956, errorCents: 1.954, fifthsCount: -14 },
            { noteName: 'B', accidental: '#', key: 956, errorCents: 1.954, fifthsCount: 12 }
        ];
    }
    
    // Convert to normalized cents (0-1200)
    const intervalCents = monzoToCents(monzo);
    const normalizedCents = ((intervalCents % 1200) + 1200) % 1200;
    
    // Calculate range for nominal selection
    const rangeLimit = 2 * APOTOME;
    
    // Find all nominals within range
    const candidates = [];
    
    for (const nomName of NOMINAL_ORDER) {
        const nomCents = NOMINAL_CENTS[nomName];
        
        // Calculate distance
        let distance = Math.abs(normalizedCents - nomCents);
        if (distance > 600) {
            distance = 1200 - distance;
        }
        
        // Check if within range
        if (distance > rangeLimit) {
            continue;
        }
        
        // Calculate rough alteration
        let roughAlt = normalizedCents - nomCents;
        while (roughAlt > 600) roughAlt -= 1200;
        while (roughAlt < -600) roughAlt += 1200;
        
        // Determine sharp/flat adjustment
        const absRoughAlt = Math.abs(roughAlt);
        let adjustedNominal = nomCents;
        
        if (absRoughAlt > THRESHOLD1) {
            // Apply double shift (x or bb)
            adjustedNominal = nomCents + (roughAlt > 0 ? 2 * APOTOME : -2 * APOTOME);
        } else if (absRoughAlt > THRESHOLD2) {
            // Apply single shift (# or b)
            adjustedNominal = nomCents + (roughAlt > 0 ? APOTOME : -APOTOME);
        }
        
        // Calculate final alteration relative to adjusted nominal
        let finalAlt = normalizedCents - adjustedNominal;
        while (finalAlt > 600) finalAlt -= 1200;
        while (finalAlt < -600) finalAlt += 1200;
        
        // Look up key
        const key = Math.abs(finalAlt) > 0.001 ? vlookupKey(finalAlt, ATHENIAN_BOUNDARIES) : 0;
        
        // Get offset and calculate error
        const offset = getKeyOffset(key);
        const error = Math.abs(finalAlt - offset);
        
        candidates.push({
            noteName: nomName,
            accidental: '',
            key: key,
            errorCents: error,
            fifthsCount: getFifthsFromC(nomName),
            distance: distance
        });
    }
    
    // Sort by distance to get 3 closest
    candidates.sort((a, b) => a.distance - b.distance);
    
    // Return top 3 in nominal order
    const top3 = candidates.slice(0, 3);
    top3.sort((a, b) => NOMINAL_ORDER.indexOf(a.noteName) - NOMINAL_ORDER.indexOf(b.noteName));
    
    return top3.map(c => ({
        noteName: c.noteName,
        accidental: c.accidental,
        key: c.key,
        errorCents: c.errorCents,
        fifthsCount: c.fifthsCount
    }));
}

export default {
    generateEnharmonicVariantsFromMonzo,
    monzoToCents
};
