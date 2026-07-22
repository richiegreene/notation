
import * as C from './constants.js';
import * as U from './utils.js';
import { state } from './state.js';

/**
 * Ben Johnston's extended just intonation notation.
 *
 * Unlike HEJI (whose naturals are Pythagorean) Johnston's naturals spell the
 * Ptolemy-Zarlino "intense" diatonic scale on C, so E, A and B each sit a
 * syntonic comma below their Pythagorean counterparts:
 *
 *   C 1/1   D 9/8   E 5/4   F 4/3   G 3/2   A 5/3   B 15/8
 *
 * Everything else is an accidental applied to those seven nominals:
 * sharp 25/24, +/- 81/80, and one comma per higher prime up to 31.
 */

// Index of each prime in the app's 24-slot monzo array (constants.js `primes`).
const I2 = 0, I3 = 1, I5 = 2, I7 = 3, I11 = 4, I13 = 5, I17 = 6, I19 = 7, I23 = 8, I29 = 9, I31 = 10;

// Highest prime Johnston notation can spell. Anything above this is un-notatable.
const HIGHEST_PRIME_INDEX = I31;

const MONZO_LENGTH = C.reference.length; // 24

/** Build a full-length monzo from a sparse {primeIndex: exponent} spec. */
function monzo(spec) {
    const m = new Array(MONZO_LENGTH).fill(0);
    for (const key in spec) m[key] = spec[key];
    return m;
}

/** arr1 - k * arr2, elementwise. */
function subtractScaled(arr1, arr2, k) {
    const out = arr1.slice();
    for (let i = 0; i < out.length; i++) out[i] -= k * (arr2[i] || 0);
    return out;
}

/** k * arr, elementwise. */
function scale(arr, k) {
    return arr.map(v => v * k);
}

// ---------------------------------------------------------------------------
// Accidental definitions
// ---------------------------------------------------------------------------

// Each entry is the monzo the glyph *multiplies the note by*, i.e. the pitch
// change it notates. Every higher-prime comma carries exactly +1 of its own
// prime, which is what makes the decomposition below a simple peel.
export const JOHNSTON_COMMAS = {
    // 25/24 - raises a nominal by a Johnston chromatic semitone.
    sharp: monzo({ [I2]: -3, [I3]: -1, [I5]: 2 }),
    // 81/80 - the syntonic comma, notated + (raise) and - (lower).
    plus: monzo({ [I2]: -4, [I3]: 4, [I5]: -1 }),
    // 35/36 - lowers by 36:35. Notated with the numeral 7; the inverted seven
    // is its reciprocal. Carries 7^+1, so 7/4 spells Bb7.
    seven: monzo({ [I2]: -2, [I3]: -2, [I5]: 1, [I7]: 1 }),
    // 33/32 - raises by 33:32, the up arrow. Carries 11^+1, so 11/8 spells F^.
    eleven: monzo({ [I2]: -5, [I3]: 1, [I11]: 1 }),
    // 65/64 - raises by 65:64. Superscript 13. Carries 13^+1, so 13/8 spells Ab13.
    thirteen: monzo({ [I2]: -6, [I5]: 1, [I13]: 1 }),
    // 51/50 - raises by 51:50. Superscript 17.
    seventeen: monzo({ [I2]: -1, [I3]: 1, [I5]: -2, [I17]: 1 }),
    // 95/96 - lowers by 96:95. Superscript 19 (Johnston defines this one in the
    // lowering direction, so the upright glyph is the one that carries 19^+1).
    nineteen: monzo({ [I2]: -5, [I3]: -1, [I5]: 1, [I19]: 1 }),
    // 46/45 - raises by 46:45. Superscript 23.
    twentyThree: monzo({ [I2]: 1, [I3]: -2, [I5]: -1, [I23]: 1 }),
    // 145/144 - raises by 145:144. Superscript 29.
    twentyNine: monzo({ [I2]: -4, [I3]: -2, [I5]: 1, [I29]: 1 }),
    // 31/30 - raises by 31:30. Superscript 31.
    thirtyOne: monzo({ [I2]: -1, [I3]: -1, [I5]: -1, [I31]: 1 }),
};

// Higher-prime commas in the order they are peeled off (and displayed).
const HIGHER_PRIMES = [
    { key: 'seven', index: I7 },
    { key: 'eleven', index: I11 },
    { key: 'thirteen', index: I13 },
    { key: 'seventeen', index: I17 },
    { key: 'nineteen', index: I19 },
    { key: 'twentyThree', index: I23 },
    { key: 'twentyNine', index: I29 },
    { key: 'thirtyOne', index: I31 },
];

// The seven nominals, keyed by position on the chain of fifths from C, as
// (exponent of 3, exponent of 5) once octaves are ignored.
const FIFTH_ORDER = ['C', 'G', 'D', 'A', 'E', 'B', 'F'];
const NOMINAL_35 = {
    C: [0, 0],   // 1/1
    G: [1, 0],   // 3/2
    D: [2, 0],   // 9/8
    A: [-1, 1],  // 5/3
    E: [0, 1],   // 5/4
    B: [1, 1],   // 15/8
    F: [-1, 0],  // 4/3
};

// The app anchors an all-zero monzo to A; Johnston spells from C, which sits
// three fifths below. Shifting the 3-exponent by +3 re-anchors without
// disturbing the octave (which the note name does not encode anyway).
const A_TO_C_FIFTH_SHIFT = 3;

// ---------------------------------------------------------------------------
// Decomposition
// ---------------------------------------------------------------------------

/**
 * Spell an absolute monzo in Johnston notation.
 *
 * Higher-prime commas are peeled off first (each removes exactly its own prime
 * and leaves a 2/3/5 residue). What remains is a pure 5-limit monzo, which
 * resolves to exactly one nominal plus a unique number of sharps and pluses:
 * the sharp (-1,+2) and plus (+4,-1) vectors span an index-7 sublattice of the
 * (3,5) exponent plane, and the seven nominals occupy its seven cosets.
 *
 * @param {number[]} absoluteMonzo - absolute pitch monzo, A-anchored.
 * @returns {{letter: string, sharp: number, plus: number, commas: Object}|null}
 *          null when the pitch uses a prime above 31 and cannot be notated.
 */
export function decomposeJohnston(absoluteMonzo) {
    if (!absoluteMonzo || absoluteMonzo.length === 0) return null;

    // Anything above the 31 limit has no Johnston symbol.
    for (let i = HIGHEST_PRIME_INDEX + 1; i < absoluteMonzo.length; i++) {
        if (absoluteMonzo[i]) return null;
    }

    let residue = absoluteMonzo.slice();
    if (residue.length < MONZO_LENGTH) {
        residue = residue.concat(new Array(MONZO_LENGTH - residue.length).fill(0));
    }
    residue[I3] += A_TO_C_FIFTH_SHIFT;

    const commas = {};
    for (const { key, index } of HIGHER_PRIMES) {
        const count = residue[index] || 0;
        commas[key] = count;
        if (count) residue = subtractScaled(residue, JOHNSTON_COMMAS[key], count);
    }

    const e3 = residue[I3];
    const e5 = residue[I5];

    const letter = FIFTH_ORDER[U.mod(e3 + 4 * e5, 7)];
    const base = NOMINAL_35[letter];
    const d3 = e3 - base[0];
    const d5 = e5 - base[1];

    // d = sharp * (-1, 2) + plus * (4, -1)  =>  plus = (2*d3 + d5) / 7
    const plus = (2 * d3 + d5) / 7;
    const sharp = 4 * plus - d3;

    return { letter, sharp, plus, commas };
}

// ---------------------------------------------------------------------------
// Glyph rendering
// ---------------------------------------------------------------------------

// SMuFL codepoints (Bravura).
const GLYPH = {
    flat: '\uE260',
    natural: '\uE261',
    sharp: '\uE262',
    doubleSharp: '\uE263',
    doubleFlat: '\uE264',
    tripleSharp: '\uE265',
    tripleFlat: '\uE266',
    plus: '\uE2B0',
    minus: '\uE2B1',
    el: '\uE2B2',       // inverted seven - raises by 36:35
    seven: '\uE2B3',    // seven - lowers by 36:35
    up: '\uE2B4',       // up arrow - raises by 33:32
    down: '\uE2B5',     // down arrow - lowers by 33:32
};

// Bravura's precomposed Johnston ligature glyphs (single glyphs that fuse one
// accidental from each of up to three families). Keyed by the family-direction
// tokens in the fixed order chromatic -> seven -> eleven:
//   chromatic  S = sharp   F = flat
//   seven      7 = seven   L = inverted seven (el)
//   eleven     U = up      D = down
// Every pair and every triple of the three families has a ligature, so any
// combination can be reduced to one glyph plus any leftover repeats.
const LIGATURE = {
    // chromatic + seven
    'S7': '\uF5EB', 'SL': '\uF5E5', 'F7': '\uF5EC', 'FL': '\uF5E8',
    // chromatic + eleven
    'SU': '\uF5E6', 'SD': '\uF5E7', 'FU': '\uF5E9', 'FD': '\uF5EA',
    // seven + eleven
    '7U': '\uF5ED', '7D': '\uF5EE', 'LU': '\uF5EF', 'LD': '\uF5F0',
    // chromatic + seven + eleven
    'S7U': '\uF5F3', 'S7D': '\uF5F4', 'SLU': '\uF5F1', 'SLD': '\uF5F2',
    'F7U': '\uF5F7', 'F7D': '\uF5F8', 'FLU': '\uF5F5', 'FLD': '\uF5F6',
};

// The higher primes that print as raised numerals rather than SMuFL glyphs.
// The reciprocal comma is shown by rotating the numeral 180 degrees.
const NUMERAL_COMMAS = {
    thirteen: '13',
    seventeen: '17',
    nineteen: '19',
    twentyThree: '23',
    twentyNine: '29',
    thirtyOne: '31',
};

/** Stack sharps or flats into the fewest SMuFL glyphs. */
function chromaticGlyphs(count) {
    if (!count) return '';
    const up = count > 0;
    let remaining = Math.abs(count);
    let out = '';
    while (remaining >= 3) { out += up ? GLYPH.tripleSharp : GLYPH.tripleFlat; remaining -= 3; }
    if (remaining === 2) out += up ? GLYPH.doubleSharp : GLYPH.doubleFlat;
    else if (remaining === 1) out += up ? GLYPH.sharp : GLYPH.flat;
    return out;
}

function repeatGlyph(glyph, count) {
    return count > 0 ? glyph.repeat(count) : '';
}

function bravuraSpan(text) {
    return text ? `<span class="johnston-accidental">${text}</span>` : '';
}

function numeralSpan(numeral, count) {
    if (!count) return '';
    const inverted = count < 0 ? ' inverted' : '';
    return `<span class="johnston-numeral${inverted}">${numeral}</span>`.repeat(Math.abs(count));
}

/**
 * Render a decomposition as HTML.
 *
 * Order follows Fonville's examples throughout Perspectives of New Music 29/2
 * (F#+, Bb7, Ab13, F7+, D-with-inverted-seven-minus): nominal, then
 * sharps/flats, then the higher-prime commas in ascending prime order, then
 * the syntonic +/- last.
 *
 * The chromatic (sharp/flat), seven and eleven accidentals ligate: Bravura has
 * a single precomposed glyph for every pair and every triple of them (e.g.
 * sharp+el, seven+sharp+up). We combine one unit from each present family into
 * the maximal ligature, then stack any leftover repeats as loose glyphs. The
 * numerals (13-31) and the syntonic +/- have no ligatures and stay separate.
 */
export function renderJohnstonAccidentals(decomposition) {
    if (!decomposition) return '';
    const { sharp, plus, commas } = decomposition;

    // The three ligature-eligible families, in ligature-key order. Each carries
    // its signed count plus the single glyph for its current direction.
    const families = [
        { count: sharp,          token: sharp > 0 ? 'S' : 'F',          glyph: sharp > 0 ? GLYPH.sharp : GLYPH.flat },
        { count: commas.seven,   token: commas.seven > 0 ? '7' : 'L',   glyph: commas.seven > 0 ? GLYPH.seven : GLYPH.el },
        { count: commas.eleven,  token: commas.eleven > 0 ? 'U' : 'D',  glyph: commas.eleven > 0 ? GLYPH.up : GLYPH.down },
    ];
    const present = families.filter(f => f.count !== 0);

    let bravura;
    if (present.length >= 2) {
        // One unit from each present family fuses into a single ligature glyph;
        // the rest stack after it. Chromatic keeps its double/triple packing.
        bravura = LIGATURE[present.map(f => f.token).join('')];
        if (sharp !== 0) bravura += chromaticGlyphs(sharp - Math.sign(sharp));
        if (commas.seven !== 0) bravura += repeatGlyph(families[1].glyph, Math.abs(commas.seven) - 1);
        if (commas.eleven !== 0) bravura += repeatGlyph(families[2].glyph, Math.abs(commas.eleven) - 1);
    } else {
        // Zero or one family present: no ligature, render the glyphs as-is.
        bravura = chromaticGlyphs(sharp)
            + repeatGlyph(families[1].glyph, Math.abs(commas.seven))
            + repeatGlyph(families[2].glyph, Math.abs(commas.eleven));
    }

    // The syntonic +/- is also a prime-3..11 (Bravura) accidental, shown after
    // the others on the lower row.
    const plusMinus = plus > 0 ? repeatGlyph(GLYPH.plus, plus) : repeatGlyph(GLYPH.minus, -plus);
    const lowerRow = bravura + plusMinus;

    // Primes 13-31 print as raised numerals. In combination they read greatest
    // prime first (left to right): 31, 29, 23, 19, 17, 13.
    const numerals = renderNumerals(commas);

    // The numerals sit centered and flush on top of the lower accidentals. With
    // no lower accidentals they render in place at the accidental slot.
    if (numerals && lowerRow) {
        return `<span class="johnston-stack">`
            + `<span class="johnston-numerals">${numerals}</span>`
            + bravuraSpan(lowerRow)
            + `</span>`;
    }
    if (numerals) {
        return `<span class="johnston-numerals johnston-numerals-inline">${numerals}</span>`;
    }
    return bravuraSpan(lowerRow);
}

/** Numeral accidentals (13-31) as HTML, greatest prime first. */
function renderNumerals(commas) {
    const descendingPrimes = ['thirtyOne', 'twentyNine', 'twentyThree', 'nineteen', 'seventeen', 'thirteen'];
    let html = '';
    for (const key of descendingPrimes) {
        html += numeralSpan(NUMERAL_COMMAS[key], commas[key]);
    }
    return html;
}

/**
 * Plain-text spelling (e.g. "Bb7", "F#+"). Not used by the UI, which renders
 * glyphs; kept as the readable form for tests and console inspection.
 */
export function johnstonToText(decomposition) {
    if (!decomposition) return 'n/a';
    const { letter, sharp, plus, commas } = decomposition;
    let out = letter;
    if (sharp > 0) out += '#'.repeat(sharp);
    if (sharp < 0) out += 'b'.repeat(-sharp);
    if (commas.seven) out += (commas.seven > 0 ? '7' : 'L').repeat(Math.abs(commas.seven));
    if (commas.eleven) out += (commas.eleven > 0 ? '^' : 'v').repeat(Math.abs(commas.eleven));
    for (const key in NUMERAL_COMMAS) {
        const count = commas[key];
        if (count) out += (count > 0 ? NUMERAL_COMMAS[key] : `(${NUMERAL_COMMAS[key]})`).repeat(Math.abs(count));
    }
    if (plus > 0) out += '+'.repeat(plus);
    if (plus < 0) out += '-'.repeat(-plus);
    return out;
}

// ---------------------------------------------------------------------------
// Johnston Entry
// ---------------------------------------------------------------------------

// The seven nominals as absolute monzos, relative to A (matching constants.js
// `notes`), in the dropdown's chain-of-fifths order F C G D A E B. These are
// the app's Pythagorean C shifted by each nominal's Johnston ratio, so E, A and
// B carry the 5-limit spelling rather than the Pythagorean one.
const C_RELATIVE_TO_A = monzo({ [I2]: 4, [I3]: -3 }); // 16/27

function nominalMonzo(e2, e3, e5) {
    return U.sumArray(C_RELATIVE_TO_A, monzo({ [I2]: e2, [I3]: e3, [I5]: e5 }));
}

export const JOHNSTON_NOTES = [
    nominalMonzo(2, -1, 0),  // F  4/3
    nominalMonzo(0, 0, 0),   // C  1/1
    nominalMonzo(-1, 1, 0),  // G  3/2
    nominalMonzo(-3, 2, 0),  // D  9/8
    nominalMonzo(0, -1, 1),  // A  5/3
    nominalMonzo(-2, 0, 1),  // E  5/4
    nominalMonzo(-3, 1, 1),  // B  15/8
];

// Each palette row offers -3..+3 of one comma; index 3 is the natural.
function commaRow(commaKey) {
    const comma = JOHNSTON_COMMAS[commaKey];
    return [-3, -2, -1, 0, 1, 2, 3].map(k => scale(comma, k));
}

export const JOHNSTON_ROWS = {
    chromatic: commaRow('sharp'),
    syntonic: commaRow('plus'),
    seven: commaRow('seven'),
    eleven: commaRow('eleven'),
    thirteen: commaRow('thirteen'),
    seventeen: commaRow('seventeen'),
    nineteen: commaRow('nineteen'),
    twentyThree: commaRow('twentyThree'),
    twentyNine: commaRow('twentyNine'),
    thirtyOne: commaRow('thirtyOne'),
};

// Palette row definitions, in display order. `label` brackets the row the way
// the HEJI palette labels its prime rows.
export const JOHNSTON_ROW_SPECS = [
    { key: 'chromatic', left: '&nbsp;&nbsp;', right: '&nbsp;&nbsp;', kind: 'bravura',
      glyphs: [GLYPH.tripleFlat, GLYPH.doubleFlat, GLYPH.flat, GLYPH.natural, GLYPH.sharp, GLYPH.doubleSharp, GLYPH.tripleSharp] },
    { key: 'syntonic', left: '&nbsp;5/', right: '/5&nbsp;', kind: 'bravura',
      glyphs: [GLYPH.minus.repeat(3), GLYPH.minus.repeat(2), GLYPH.minus, GLYPH.natural, GLYPH.plus, GLYPH.plus.repeat(2), GLYPH.plus.repeat(3)] },
    { key: 'seven', left: '&nbsp;7/', right: '/7&nbsp;', kind: 'bravura',
      glyphs: [GLYPH.el.repeat(3), GLYPH.el.repeat(2), GLYPH.el, GLYPH.natural, GLYPH.seven, GLYPH.seven.repeat(2), GLYPH.seven.repeat(3)] },
    { key: 'eleven', left: '/11', right: '11/', kind: 'bravura',
      glyphs: [GLYPH.down.repeat(3), GLYPH.down.repeat(2), GLYPH.down, GLYPH.natural, GLYPH.up, GLYPH.up.repeat(2), GLYPH.up.repeat(3)] },
    { key: 'thirteen', left: '13/', right: '/13', kind: 'numeral', numeral: '13' },
    { key: 'seventeen', left: '17/', right: '/17', kind: 'numeral', numeral: '17' },
    { key: 'nineteen', left: '/19', right: '19/', kind: 'numeral', numeral: '19' },
    { key: 'twentyThree', left: '23/', right: '/23', kind: 'numeral', numeral: '23' },
    { key: 'twentyNine', left: '29/', right: '/29', kind: 'numeral', numeral: '29' },
    { key: 'thirtyOne', left: '31/', right: '/31', kind: 'numeral', numeral: '31' },
];

/** Build the button face for one palette cell (value 0..6). */
function paletteButtonFace(spec, value) {
    const count = value - 3;
    if (spec.kind === 'bravura') {
        return `<span class="johnston-accidental">${spec.glyphs[value]}</span>`;
    }
    if (count === 0) return `<span class="johnston-accidental">${GLYPH.natural}</span>`;
    return numeralSpan(spec.numeral, count);
}

/** Render the Johnston Entry palette into #johnstonPalette. */
export function generateJohnstonPalette() {
    const palette = $('#johnstonPalette');
    if (!palette.length) return;

    let html = '';
    for (const spec of JOHNSTON_ROW_SPECS) {
        let buttons = '';
        for (let value = 0; value <= 6; value++) {
            const selected = value === 3 ? ' selected' : '';
            buttons += `<button type="button" class="johnston-button johnston-${spec.key}${selected}" `
                + `data-johnston-row="${spec.key}" value="${value}">${paletteButtonFace(spec, value)}</button>`;
        }
        html += `<div class="johnston-button-row">`
            + `<span class="label">${spec.left}</span>`
            + buttons
            + `<span class="label">${spec.right}</span>`
            + `</div>`;
    }
    palette.html(html);
}

/** Currently selected value (0..6) for one palette row. */
function selectedRowValue(rowKey) {
    const value = $(`.johnston-${rowKey}.selected`).attr('value');
    return value === undefined ? 3 : parseInt(value, 10);
}

export function getJohnstonOctave() {
    return $('#johnstonOctaveDropdown').val();
}

export function getJohnstonNote() {
    return $('#johnstonDiatonicNoteDropdown').val();
}

/**
 * Absolute monzo for the current Johnston Entry palette state.
 * Mirrors the HEJI Entry path in calculator.js.
 */
export function readJohnstonEntry() {
    let result = C.octave[getJohnstonOctave()];
    result = U.sumArray(result, JOHNSTON_NOTES[getJohnstonNote()]);
    for (const spec of JOHNSTON_ROW_SPECS) {
        result = U.sumArray(result, JOHNSTON_ROWS[spec.key][selectedRowValue(spec.key)]);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Johnston Output
// ---------------------------------------------------------------------------

export function generateJohnstonOutputColumns(numColumns) {
    const container = $('.johnston-output-container');
    if (!container.length) return;
    container.empty();

    for (let i = 1; i <= numColumns; i++) {
        container.append(`
            <div class="output-column johnston-output-column">
                <div class="johnston-notation-display">
                    <span class="johnston-letter" id="johnstonNoteName_${i}"></span><!--
                    --><span class="johnston-symbols" id="johnstonNotation_${i}"></span>
                </div>
                <div class="output-region-ratio">
                    <div class="ratio-display-container">
                        <div id="johnstonNum_${i}" class="num" value="1"></div>
                        <div id="johnstonDen_${i}" class="den" value="1"></div>
                    </div>
                </div>
                <div class="output-region-values">
                    <div class="output-content">
                        <span id="johnstonMidiNote_${i}"></span><span id="johnstonMidiAccidental_${i}" class="midiAccidental"></span><span id="johnstonCents_${i}" value="0"></span>
                    </div>
                    <div class="output-content">
                        <div id="johnstonFrequency_${i}" value="440"></div>
                    </div>
                    <div class="output-content">
                        <div id="johnstonJIgross_${i}" value="0">0</div>
                    </div>
                </div>
            </div>
        `);
    }
}

/**
 * Update one Johnston Output column.
 *
 * Johnston notation is exact rather than approximate, so the notated pitch is
 * the input pitch: the frequency and cents readouts need no error correction
 * (unlike the Sagittal window).
 */
export function updateJohnstonOutputDisplays(columnIndex, outputFrequency, ratioNum, ratioDen, absoluteMonzo) {
    const octaveReduce = $('#johnstonNormalize').prop('checked');
    const decomposition = state.hasPrimeGreaterThan89 ? null : decomposeJohnston(absoluteMonzo);

    if (decomposition) {
        $(`#johnstonNoteName_${columnIndex}`).text(decomposition.letter);
        $(`#johnstonNotation_${columnIndex}`).html(renderJohnstonAccidentals(decomposition));
    } else {
        $(`#johnstonNoteName_${columnIndex}`).text('');
        // Matches HEJI Output's n/a exactly: no class, so it falls through to
        // the app-wide `* { font-size: 11.2px }` rule instead of the large
        // glyph sizing used for actual notation.
        $(`#johnstonNotation_${columnIndex}`).html("<span style='font-family: monospace;'>n/a</span>");
    }

    // Nearest 12-tET pitch class name and cent deviation, directly beneath the
    // ratio like in HEJI Output. This reading describes the sounding pitch,
    // not the Johnston spelling, so it's identical to HEJI's: copy the values
    // already computed by UI.getPC()/getCentDeviation() earlier in this same
    // calculation pass rather than recomputing them.
    $(`#johnstonMidiNote_${columnIndex}`).text($(`#midiNote_${columnIndex}`).text());
    $(`#johnstonMidiAccidental_${columnIndex}`).text($(`#midiAccidental_${columnIndex}`).text());
    $(`#johnstonCents_${columnIndex}`).text($(`#cents_${columnIndex}`).text());

    // Ratio, folded into the octave above 1/1 when octave reduce is on.
    let num = ratioNum;
    let den = ratioDen;
    if (octaveReduce && num > 0 && den > 0) {
        const folded = foldRatio(num, den);
        num = folded[0];
        den = folded[1];
    }
    if (num <= Number.MAX_SAFE_INTEGER && den <= Number.MAX_SAFE_INTEGER) {
        $(`#johnstonNum_${columnIndex}`).text(num);
        $(`#johnstonDen_${columnIndex}`).text(den);
    } else {
        $(`#johnstonNum_${columnIndex}`).text(num / den);
        $(`#johnstonDen_${columnIndex}`).text(1);
    }

    let frequency = outputFrequency;
    if (octaveReduce && ratioNum > 0 && ratioDen > 0) {
        const r = ratioNum / ratioDen;
        frequency = state.freq1to1 * r * Math.pow(2, -Math.floor(Math.log2(r)));
    }
    state.johnstonOutputFrequencies[columnIndex] = frequency;
    $(`#johnstonFrequency_${columnIndex}`).text(
        (frequency !== undefined && !isNaN(frequency)) ? frequency.toFixed(state.precision) + 'Hz' : ''
    );

    if (ratioNum > 0 && ratioDen > 0) {
        let centsToRef = 1200 * Math.log2(ratioNum / ratioDen);
        if (octaveReduce) centsToRef = U.mod(centsToRef, 1200);
        const sign = centsToRef > 0 ? '+' : '';
        $(`#johnstonJIgross_${columnIndex}`).text(sign + centsToRef.toFixed(state.precision) + 'c');
    } else {
        $(`#johnstonJIgross_${columnIndex}`).text('');
    }
}

/** Fold a ratio into [1, 2) without leaving integer arithmetic. */
function foldRatio(num, den) {
    let n = num;
    let d = den;
    while (n / d >= 2) {
        d *= 2;
        const reduced = U.reduce(n, d);
        n = reduced[0];
        d = reduced[1];
    }
    while (n / d < 1) {
        n *= 2;
        const reduced = U.reduce(n, d);
        n = reduced[0];
        d = reduced[1];
    }
    return [n, d];
}
