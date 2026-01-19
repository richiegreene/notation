// js/calc/edo.js

// Utility for modulo operation that behaves like Python's (always positive result)
function mod(n, m) {
    return ((n % m) + m) % m;
}

class Note {
    constructor() {
        this.sharps = 0;
        this.s_ups = 0;
        this.s_lifts = 0;
        this.s_nom = 0;
        this.flats = 0;
        this.f_ups = 0;
        this.f_lifts = 0;
        this.f_nom = 0;
    }
}

function fifth(edo) {
    return Math.round(Math.log(1.5) / Math.log(2) * edo);
}

function majsec(edo, p5) {
    return (p5 * 2) - edo;
}

function apotome(edo, p5) {
    if ((edo % 7 === 0 || edo % 5 === 0) && edo < 36) {
        return edo;
    }
    return (p5 * 7) - (edo * 4);
}

function updown(edo, p5) {
    if (edo < 66) {
        return 1;
    }
    if (edo === 129) {
        return 3;
    }
    const y3 = Math.round(Math.log(1.25) / Math.log(2) * edo);
    const sc = (p5 * 4) - (edo * 2) - y3;
    return 1; // if sc == 0 else sc (simplified based on Python logic where sc is often non-zero for higher EDOS)
}

function verysharp(edo, p5) {
    return p5 / edo > 0.6 || (edo < 35 && edo % 5 === 0);
}

function halfacc(a1) {
    return a1 % 2 === 0;
}

function basicnotes(notes, edo, p5, p2, penta, refDiatonicOffset) {
    notes[0].s_nom = mod(0 + refDiatonicOffset, 7);
    notes[p2].s_nom = mod(1 + refDiatonicOffset, 7);
    notes[edo - p5].s_nom = mod(3 + refDiatonicOffset, 7);
    notes[p5].s_nom = mod(4 + refDiatonicOffset, 7);
    notes[p5 + p2].s_nom = mod(5 + refDiatonicOffset, 7);

    notes[0].f_nom = mod(0 + refDiatonicOffset, 7);
    notes[p2].f_nom = mod(1 + refDiatonicOffset, 7);
    notes[edo - p5].f_nom = mod(3 + refDiatonicOffset, 7);
    notes[p5].f_nom = mod(4 + refDiatonicOffset, 7);
    notes[p5 + p2].f_nom = mod(5 + refDiatonicOffset, 7);

    if (!penta) {
        notes[2 * p2].s_nom = mod(2 + refDiatonicOffset, 7);
        notes[p5 + (2 * p2)].s_nom = mod(6 + refDiatonicOffset, 7);
        notes[2 * p2].f_nom = mod(2 + refDiatonicOffset, 7);
        notes[p5 + (2 * p2)].f_nom = mod(6 + refDiatonicOffset, 7);
    }
}

function trround(x) {
    if (x - Math.floor(x) === 0.5) {
        return x > 0 ? Math.floor(x) : Math.ceil(x);
    }
    return Math.round(x);
}

// In JavaScript, we'll return an object with the values
function setsharpcounts(x, ap, ud) {
    let apc = x / ap;
    let ra = trround(apc);
    let udc = ((ra * ap) - x) / ud;
    let ru = trround(udc);
    let ldc = (ru * ud) - ((ra * ap) - x);
    ru *= -1; // Python's internal logic
    return { ra: ra, ru: ru, ldc: ldc };
}

function setsharpnotes(note, nom, r_ap, r_ud, ldcount) {
    note.s_nom = nom;
    note.sharps = r_ap;
    note.s_ups = r_ud;
    note.s_lifts = ldcount;
}

function sharpnotes(notes, edo, p5, p2, ap, ud, penta) {
    for (let i = 1; i < p2; i++) {
        const counts = setsharpcounts(i, ap, ud);
        setsharpnotes(notes[i], 0, counts.ra, counts.ru, counts.ldc);
        setsharpnotes(notes[edo - p5 + i], 3, counts.ra, counts.ru, counts.ldc);
        setsharpnotes(notes[p5 + i], 4, counts.ra, counts.ru, counts.ldc);
    }
    if (penta) {
        for (let i = 1; i < (edo - p5) - p2; i++) {
            const counts = setsharpcounts(i, ap, ud);
            setsharpnotes(notes[p2 + i], 1, counts.ra, counts.ru, counts.ldc);
            setsharpnotes(notes[p5 + p2 + i], 5, counts.ra, counts.ru, counts.ldc);
        }
    } else {
        for (let i = 1; i < p2; i++) {
            const counts = setsharpcounts(i, ap, ud);
            setsharpnotes(notes[p2 + i], 1, counts.ra, counts.ru, counts.ldc);
            setsharpnotes(notes[p5 + p2 + i], 5, counts.ra, counts.ru, counts.ldc);
        }
        for (let i = 1; i < (edo - p5) - (p2 * 2); i++) {
            const counts = setsharpcounts(i, ap, ud);
            setsharpnotes(notes[(p2 * 2) + i], 2, counts.ra, counts.ru, counts.ldc);
            setsharpnotes(notes[p5 + (p2 * 2) + i], 6, counts.ra, counts.ru, counts.ldc);
        }
    }
}

// In JavaScript, we'll return an object with the values
function setflatcounts(x, ap, ud) {
    let apc = x / ap;
    let ra = trround(apc);
    let udc = ((ra * ap) - x) / ud;
    let ru = trround(udc);
    let ldc = ((ra * ap) - x) - (ru * ud);
    return { ra: ra, ru: ru, ldc: ldc };
}

function setflatnotes(note, nom, r_ap, r_ud, ldcount) {
    note.f_nom = nom;
    note.flats = r_ap;
    note.f_ups = r_ud;
    note.f_lifts = ldcount;
}

function flatnotes(notes, edo, p5, p2, ap, ud, penta) {
    for (let i = 1; i < p2; i++) {
        const counts = setflatcounts(i, ap, ud);
        setflatnotes(notes[p2 - i], 1, counts.ra, counts.ru, counts.ldc);
        setflatnotes(notes[p5 - i], 4, counts.ra, counts.ru, counts.ldc);
        setflatnotes(notes[p5 + p2 - i], 5, counts.ra, counts.ru, counts.ldc);
    }
    if (penta) {
        for (let i = 1; i < (edo - p5) - p2; i++) {
            const counts = setflatcounts(i, ap, ud);
            setflatnotes(notes[edo - i], 0, counts.ra, counts.ru, counts.ldc);
            setflatnotes(notes[edo - p5 - i], 3, counts.ra, counts.ru, counts.ldc);
        }
    } else {
        for (let i = 1; i < (edo - p5) - (p2 * 2); i++) {
            const counts = setflatcounts(i, ap, ud);
            setflatnotes(notes[edo - i], 0, counts.ra, counts.ru, counts.ldc);
            setflatnotes(notes[edo - p5 - i], 3, counts.ra, counts.ru, counts.ldc);
        }
        for (let i = 1; i < p2; i++) {
            const counts = setflatcounts(i, ap, ud);
            setflatnotes(notes[(p2 * 2) - i], 2, counts.ra, counts.ru, counts.ldc);
            setflatnotes(notes[p5 + (p2 * 2) - i], 6, counts.ra, counts.ru, counts.ldc);
        }
    }
}

function printnom(nom) {
    const noteNames = ["F", "C", "G", "D", "A", "E", "B"]; // User's desired output mapping for 0-6
    // Internal C-centric nominal (input `nom`) to F-centric index
    const cCentricNominalToFcentricIndex = {
        0: 1, // C (C-centric 0) is at index 1 in F-centric noteNames
        1: 3, // D (C-centric 1) is at index 3 in F-centric noteNames
        2: 5, // E (C-centric 2) is at index 5 in F-centric noteNames
        3: 0, // F (C-centric 3) is at index 0 in F-centric noteNames
        4: 2, // G (C-centric 4) is at index 2 in F-centric noteNames
        5: 4, // A (C-centric 5) is at index 4 in F-centric noteNames
        6: 6  // B (C-centric 6) is at index 6 in F-centric noteNames
    };
    const fCentricIndex = cCentricNominalToFcentricIndex[mod(nom, 7)];
    return noteNames[fCentricIndex];
}

function printupdown(ups) {
    return "v".repeat(Math.max(0, -ups)) + "^".repeat(Math.max(0, ups));
}

function printliftdrop(lifts) {
    return "\\".repeat(Math.max(0, -lifts)) + "/".repeat(Math.max(0, lifts));
}

function printsharp(sharps, half) {
    let result = "";
    if (half) {
        if (sharps % 2 !== 0) {
            result += "^"; // Half sharp
            sharps -= 1;
        }
        if (sharps % 4 !== 0) {
            if (result.endsWith("^")) {
                result = result.slice(0, -1) + "^^^"; // Three half sharp
                sharps -= 2;
            } else {
                result += "#"; // Sharp
                sharps -= 2;
            }
        }
        while (sharps > 0) {
            result += "x"; // Double sharp
            sharps -= 4;
        }
    } else {
        if (sharps % 2 !== 0) {
            result += "#"; // Sharp
            sharps -= 1;
        }
        while (sharps > 0) {
            result += "x"; // Double sharp
            sharps -= 2;
        }
    }
    return result;
}

function printflat(flats, half) {
    let result = "";
    if (half) {
        if (flats % 2 !== 0) {
            result += "v"; // Half flat
            flats -= 1;
        }
        if (flats % 4 !== 0) {
            if (result.endsWith("v")) {
                result = result.slice(0, -1) + "vvv"; // Three half flat
                flats -= 2;
            } else {
                result += "b"; // Flat
                flats -= 2;
            }
        }
        while (flats > 0) {
            result += "bb"; // Double flat
            flats -= 4;
        }
    } else {
        while (flats >= 2) {
            result += "bb"; // Double flat
            flats -= 2;
        }
        if (flats === 1) {
            result += "b"; // Flat
        }
    }
    return result;
}

function printnote(note, halves) {
    let sharp_name;
    let flat_name;

    // Use current nominal for both sharp and flat names for simplicity if they are the same
    // Otherwise, generate both and return "sharp_name, flat_name" (which is what the Python does for different nominals)
    sharp_name = (
        printliftdrop(note.s_lifts) +
        printupdown(note.s_ups) +
        printnom(note.s_nom) +
        printsharp(note.sharps, halves)
    );
    
    flat_name = (
        printliftdrop(note.f_lifts) +
        printupdown(note.f_ups) +
        printnom(note.f_nom) +
        printflat(note.flats, halves)
    );

    if (note.s_nom === note.f_nom) {
        // If nominals are the same, we check for equivalence in accidentals
        // This is a simplified logic compared to full HEJI but works for basic EDO notation
        if (sharp_name.length <= flat_name.length) {
            return sharp_name;
        } else {
            return flat_name;
        }
    } else {
        return `${sharp_name}, ${flat_name}`;
    }
}

export function calculateEdoNotation(n, m, ref12) {
    if (m < 7 && m !== 5) {
        return "n/a";
    }

    const p5 = fifth(m);
    const p2 = majsec(m, p5);
    let a1 = apotome(m, p5);
    const ud = updown(m, p5);
    const penta = verysharp(m, p5);
    const halves = halfacc(a1);

    if (halves) {
        a1 = Math.floor(a1 / 2); // Integer division
    }

    const notes = Array.from({ length: m }, () => new Note());

    // Calculate the diatonic offset based on ref12
    const refDiatonicOffset = getDiatonicOffsetFromRef12(ref12);

    basicnotes(notes, m, p5, p2, penta, refDiatonicOffset);
    sharpnotes(notes, m, p5, p2, a1, ud, penta);
    flatnotes(notes, m, p5, p2, a1, ud, penta);

    n = mod(n, m); // Ensure n is within bounds

    return printnote(notes[n], halves);
}

// Helper function to convert MIDI pitch class (ref12) to C-centric diatonic nominal (C=0, D=1, E=2, F=3, G=4, A=5, B=6)
function getDiatonicOffsetFromRef12(ref12) {
    const midiToNominalC0 = {
        0: 0,  // C
        2: 1,  // D
        4: 2,  // E
        5: 3,  // F
        7: 4,  // G
        9: 5,  // A
        11: 6  // B
    };
    // Default to C (0) if not a diatonic MIDI pitch class, or if ref12 is undefined
    return midiToNominalC0[ref12] !== undefined ? midiToNominalC0[ref12] : 0;
}
