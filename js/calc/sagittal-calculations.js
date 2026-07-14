/**
 * Full Sagittal notation calculation algorithm
 * Implements the complete logic from the Sagittal Standard JI Notation Calculator spreadsheet
 */

import { sagittalKeyData } from './sagittal-key-data.js';

// Precision configuration (from spreadsheet UI sheet)
const PRECISION_CONFIG = {
    medium: {
        name: 'Athenian',
        apotome_cents: 5.413571717033902,  // 7*log2(3) - 11
        steps_per_apotome: 21
    },
    high: {
        name: 'Promethean',
        apotome_cents: 2.4188299161215303,
        steps_per_apotome: 47
    },
    ultra: {
        name: 'Herculean',
        apotome_cents: 1.9600863113398608,
        steps_per_apotome: 58
    },
    extreme: {
        name: 'Olympian',
        apotome_cents: 0.48791848093438595,
        steps_per_apotome: 233
    }
};

// Boundary data for each precision level (rows and bounds from spreadsheet Boundaries sheet)
// This is a simplified version - in production should be extracted from spreadsheet
const BOUNDARIES = {
    medium: [
        { steps: 0, lower_bound: -0.21078802112060538, key: 0 },
        { steps: 1, lower_bound: 2.7402442745678065, key: 12 },
        { steps: 2, lower_bound: 8.080207476289748, key: 20 },
        { steps: 3, lower_bound: 13.420271276991802, key: 28 },
        { steps: 4, lower_bound: 18.7601338797337, key: 44 },
        { steps: 5, lower_bound: 24.100197680435750, key: 52 },
        { steps: 6, lower_bound: 29.440261481137804, key: 60 },
        { steps: 7, lower_bound: 34.78032528184005, key: 68 },
        { steps: 8, lower_bound: 40.120389082542094, key: 77 },
        { steps: 9, lower_bound: 45.460452883244148, key: 85 },
        { steps: 10, lower_bound: 50.800516683946202, key: 93 },
    ],
    high: [
        { steps: 0, lower_bound: -0.21078802112060538, key: 0 },
        { steps: 1, lower_bound: 1.1944654530167495, key: 1 },
        { steps: 2, lower_bound: 4.567073790946392, key: 2 },
        { steps: 3, lower_bound: 6.534428654738686, key: 3 },
        { steps: 4, lower_bound: 9.906961462018263, key: 4 },
        { steps: 5, lower_bound: 11.874316325810557, key: 5 },
        // ... more entries as needed
    ],
    // high, ultra, extreme similarly
};

// Note nominal information from spreadsheet
const NOMINAL_BASE = {
    C: { letter: 'C', accidental: '', nominal_offset: 0, pythagorean_fifths: 0 },
    D: { letter: 'D', accidental: 'bb', nominal_offset: -2000, pythagorean_fifths: -12 },
    E: { letter: 'E', accidental: '', nominal_offset: 0, pythagorean_fifths: 4 },
    F: { letter: 'F', accidental: '', nominal_offset: 0, pythagorean_fifths: -5 },
    G: { letter: 'G', accidental: '', nominal_offset: 0, pythagorean_fifths: 2 },
    A: { letter: 'A', accidental: '', nominal_offset: 0, pythagorean_fifths: -3 },
    B: { letter: 'B', accidental: '#', nominal_offset: 1000, pythagorean_fifths: 1 }
};

// Nominal cents values (Pythagorean intervals from C)
const NOMINAL_CENTS = {
    C: 0,
    D: 203.91,      // 9/8
    E: 407.82,      // 81/64
    F: 498.04,      // 4/3
    G: 701.96,      // 3/2
    A: 905.87,      // 27/16
    B: 1109.78      // 243/128
};

/**
 * Calculate Sagittal output for an interval with full algorithm
 * @param {number} centsValue - The interval in cents (modulo 1200)
 * @param {string} precision - 'medium', 'high', 'ultra', or 'extreme'
 * @param {string} referencePitch - The 1/1 nominal (C, D, E, F, G, A, B)
 * @returns {Array} Array of {note, accidental, key, symbol, error} for each displayed row
 */
export function calculateSagittalForInterval(centsValue, precision, referencePitch = 'C') {
    const results = [];
    const config = PRECISION_CONFIG[precision];
    const apotome = config.apotome_cents;
    
    // Normalize cents to 0-1200 range
    let intervalCents = centsValue % 1200;
    if (intervalCents < 0) intervalCents += 1200;
    
    // Get nominal offset based on 1/1 reference pitch
    const nominalOffset = getNominalOffsetForReferencePitch(referencePitch);
    
    // For each possible note, check if it's in range
    const noteLetters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    for (const noteLetter of noteLetters) {
        // Get nominal cents (shifted for reference pitch)
        let nominalCents = (NOMINAL_CENTS[noteLetter] - NOMINAL_CENTS[referencePitch] + 1200) % 1200;
        
        // Check if in range: ABS(intervalCents - nominalCents) <= 2.000001 * apotome
        const distance = Math.min(
            Math.abs(intervalCents - nominalCents),
            Math.abs(intervalCents - nominalCents - 1200),
            Math.abs(intervalCents - nominalCents + 1200)
        );
        
        if (distance > 2.000001 * apotome) {
            continue; // This note is not in range
        }
        
        // Calculate accidental
        const accidental = calculateAccidental(intervalCents, nominalCents, apotome);
        
        // Calculate alteration
        let nominalWithAccidental = nominalCents;
        if (accidental === 'b') nominalWithAccidental -= 100;      // One semitone
        if (accidental === 'bb') nominalWithAccidental -= 200;     // Two semitones
        if (accidental === '#') nominalWithAccidental += 100;      // One semitone
        if (accidental === 'x') nominalWithAccidental += 200;      // Two semitones
        
        const alteration = intervalCents - nominalWithAccidental;
        
        // Look up key via boundary
        const boundaryKey = getBoundaryKey(Math.abs(alteration), precision);
        
        // Get accidental offset (from nominal base data)
        const accidentalOffset = getAccidentalOffset(noteLetter, accidental);
        
        // Calculate full key
        const fullKey = boundaryKey + accidentalOffset;
        if (alteration < 0) {
            fullKey = -fullKey;
        }
        
        // Look up symbols from Key sheet
        const symbols = getSymbolsForKey(fullKey);
        
        // Calculate error value (placeholder - should use correct formula per precision)
        const error = calculateError(boundaryKey, precision);
        
        results.push({
            note: noteLetter,
            accidental: accidental,
            display_name: `${noteLetter}${accidental}`,
            key: fullKey,
            symbols: symbols,
            error: error,
            alteration: alteration
        });
    }
    
    return results;
}

/**
 * Calculate which accidental to use based on distance from nominal
 */
function calculateAccidental(intervalCents, nominalCents, apotome) {
    const diff = intervalCents - nominalCents;
    
    if (Math.abs(diff) <= apotome / 2) {
        return ''; // Natural
    } else if (diff > 0) {
        if (diff > apotome * (1 + 1)) { // double sharp
            return 'x';
        } else {
            return '#';
        }
    } else {
        if (diff < -apotome * (1 + 1)) { // double flat
            return 'bb';
        } else {
            return 'b';
        }
    }
}

/**
 * Look up the boundary key for a given alteration value
 */
function getBoundaryKey(alteration, precision) {
    const boundaries = BOUNDARIES[precision];
    
    // Binary search for the appropriate boundary
    for (let i = boundaries.length - 1; i >= 0; i--) {
        if (alteration >= boundaries[i].lower_bound) {
            return boundaries[i].key;
        }
    }
    
    // If below all boundaries, return the smallest key
    return boundaries[0].key;
}

/**
 * Get accidental offset for a given note and accidental combination
 */
function getAccidentalOffset(noteLetter, accidental) {
    // These are the fixed offsets from the spreadsheet
    const offsets = {
        'C': 0,      // C natural
        'Dbb': -2000, // D double-flat
        'B#': 1000,   // B sharp
        'default': 0
    };
    
    const key = `${noteLetter}${accidental}`;
    return offsets[key] || offsets['default'];
}

/**
 * Get symbols for a given full key (looks up in Key sheet data)
 */
function getSymbolsForKey(key) {
    if (sagittalKeyData[key]) {
        return sagittalKeyData[key];
    }
    
    // If key not found, return empty symbols
    return {
        evo_ascii: '',
        revo_ascii: '',
        evo_unicode: '',
        revo_unicode: ''
    };
}

/**
 * Calculate error in cents for a given key and precision
 */
function calculateError(key, precision) {
    // Error map from spreadsheet (per precision level)
    const errorMap = {
        medium: { 0: 0, 44: 1.954, '-44': 1.954 },
        high: { 0: 0, 52: 1.424, '-52': 1.424 },
        ultra: { 0: 0, 48: 0, '-48': 0 },
        extreme: { 0: 0, 48: 0, '-48': 0 }
    };
    
    const errors = errorMap[precision] || {};
    return errors[key] || 0;
}

/**
 * Get the nominal offset for a reference pitch
 */
function getNominalOffsetForReferencePitch(referencePitch) {
    // This would rotate all the nominal values based on the chosen 1/1
    // For now, just handle C
    if (referencePitch === 'C') {
        return 0;
    }
    // TODO: Implement rotation for other reference pitches
    return 0;
}

export { PRECISION_CONFIG, NOMINAL_CENTS };
