import { state } from './state.js';
import * as U from './utils.js';
import { buildJiScale, nameJiDegrees, buildEdoDegrees } from './tuner-notation.js';
import * as Mic from '../tuner-mic.js';
import { playFrequencies, stopAllFrequencies } from '../audio-playback.js';

/**
 * The Tuner stage.
 *
 * Wires the language / limit controls in the Tuner drawer, drives mic pitch
 * detection, and draws the meter across the whole window.
 *
 * TWO SHAPES, ONE SET OF MARKS. Straight is a strobe strip: a fixed needle at
 * the centre is the pitch coming in, and the scale slides past it. Round is
 * the instrument every clip-on tuner and every speedometer already taught —
 * a needle at twelve o'clock and the same scale swung beneath it on an arc.
 *
 * Nothing about WHAT is drawn changes between them. The note names and the
 * ratios are ordinary HTML built by the same notation engines the output
 * windows use, so a HEJI accidental, a Sagittal flag and a Johnston numeral
 * come out identical in either; only where each mark is put differs, and that
 * is one function (place) reading one geometry (geometry). Everything else —
 * how large a name may be before its neighbour collides, how far off pitch
 * counts as in tune, which scale is being listened for — is shared, because
 * none of it is a fact about the shape.
 *
 * 1/1 = C for spelling; Hz / cents use the app-wide 1/1 frequency
 * (state.freq1to1). The mic is only opened when the user presses the toggle.
 */

const DEFAULT_CENTS_WINDOW = 100; // total cents spanned across the meter
const IN_TUNE_DEFAULT = 3; // cents within which a note name turns fully blue
const TUNE_STEP = 2;       // cents per gradient step outside the in-tune band
/* The in-tune band is the Display drawer's In-tune window slider. It is the
   one definition of "on the note" the meter has, so it moves the marks' blue
   and the ruler's lit dot as well as the field's green: two bands would say
   the eye and the field disagree about what in tune is. */
const IN_TUNE_STORE = 'notation.tuner.intune.v1';
function inTune() {
    const v = parseFloat(el('tunerInTune') && el('tunerInTune').value);
    return Number.isFinite(v) && v > 0 ? v : IN_TUNE_DEFAULT;
}
// All tune-state classes, and a helper that returns the class for a given
// absolute cent deviation: full blue inside the band, then three 2c gradient
// steps (tune-1 nearest, tune-3 farthest), and nothing beyond.
const TUNE_CLASSES = ['in-tune', 'tune-1', 'tune-2', 'tune-3'];
function tuneClassFor(absDelta) {
    const band = inTune();
    if (absDelta <= band) return 'in-tune';
    if (absDelta <= band + TUNE_STEP) return 'tune-1';
    if (absDelta <= band + 2 * TUNE_STEP) return 'tune-2';
    if (absDelta <= band + 3 * TUNE_STEP) return 'tune-3';
    return '';
}
function applyTuneClass(elm, cls) {
    if (!elm) return;
    elm.classList.remove(...TUNE_CLASSES);
    if (cls) elm.classList.add(cls);
}

const SHAPE_STORE = 'notation.tuner.shape.v1';
const GRID_STORE = 'notation.tuner.grid.v1';
const COLOR_STORE = 'notation.tuner.color.v1';
const COMPLEXITY_STORE = 'notation.tuner.complexity.v1';

/* ---- the field's colour ----
 * With the Display drawer's color latch down, the whole field says how far
 * the nearest degree is. The marks already say it three steps at a time, in
 * the app's blue, for the mark you are looking AT; this is for the field you
 * are not looking at — a wash read at the edge of the eye while the eye is on
 * the instrument. So it is a continuous ramp and not steps, and it is the
 * colour every tuner already taught rather than the blue: green inside the
 * in-tune band, amber on the way out, red once it is gone. The three stops
 * are Tetrads' own --ok and --warn and a red of the same weight.
 *
 * COLOR_RAMP_CENTS is how far past the band the ramp runs before it is fully
 * red: about a quarter-tone, so a note half a step off in 41-EDO is plainly
 * out and one in a dense 11-limit scale can still be somewhere between. */
const COLOR_RAMP_CENTS = 25;
const COLOR_STOPS = [[0x79, 0xd1, 0x8b], [0xff, 0xb4, 0x54], [0xe8, 0x5d, 0x5d]];
function tuneColorFor(absDelta) {
    const t = clamp((absDelta - inTune()) / COLOR_RAMP_CENTS, 0, 1);
    // Two segments, green→amber then amber→red, so the midpoint is amber.
    const seg = t < 0.5 ? 0 : 1;
    const u = seg === 0 ? t * 2 : (t - 0.5) * 2;
    const a = COLOR_STOPS[seg], b = COLOR_STOPS[seg + 1];
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * u));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/* ---- the grid ----
 * Lines through the field from every cent of the ruler and from every degree
 * of the scale, in either shape. The dots already say where each mark IS; the
 * lines say which way it is GOING. A dot sliding under a needle is a small
 * thing to watch, and a whole field of lines sliding with it is not — the
 * motion reads at the edge of the eye, and how far the nearest degree line
 * still has to travel is the distance left to the goal.
 *
 * The cent lines are kept a little sparser than the dots: a line every four
 * pixels is a grey wash, not a grid. */
const GRID_MIN_PX = 12;
/* On the dial the lines are spokes, and how far in and out they run is a
   fraction of the radius: from a little inside the ratios ring to a little
   past the names, the band the reading lives in. */
const GRID_IN = 0.60;
const GRID_OUT = 1.06;

/* How far the window may be zoomed, in cents end to end. Four is about as far
   in as the reading means anything — the mic's own smoothing is wider than a
   cent — and 1200 is the whole octave, past which the scale would start
   repeating itself across the meter. */
const WINDOW_MIN = 4;
const WINDOW_MAX = 1200;
const ZOOM_BADGE_MS = 1100;

/* ---- the dial ----
 * 120 degrees of arc rather than a half-circle. A wider sweep buys nothing —
 * the window is the same number of cents either way — and costs legibility at
 * the ends, where a note name would sit almost beside the needle's own axis
 * with its neighbours stacked above and below it rather than beside it. At
 * 120 the ends land at half-height, the arc spans the full width, and every
 * name is still read left to right.
 *
 * The three rings are the same three rows the strip has, bent: names outside
 * where there is the most arc to spend on them, the cent ruler under them,
 * ratios inside. The needle runs from the hub out past the names and is drawn
 * BEHIND them, the way the strip's centre line always was. */
/* HOW MUCH OF THE CIRCLE THE ARC IS, IS DECIDED BY THE FIELD'S SHAPE.
 *
 * 120 degrees is the right sweep in a landscape window: shallow, wide, every
 * name still read left to right. It is the wrong one on a phone held upright,
 * where the arc is bounded by a narrow width and simply refuses the height
 * underneath it — a small dial adrift in a tall grey field. A wider sweep
 * wraps the ends down the sides, which is the only way an arc can spend
 * height it has been given and width it has not. So the span is read off the
 * field's aspect: the landscape sweep where there is width to use, and up to
 * two-thirds of the circle where there is not. */
const DIAL_SPAN_WIDE = 120;
const DIAL_SPAN_TALL = 170;
const DIAL_ASPECT_WIDE = 1.30;  // w/h at or above which the sweep is DIAL_SPAN_WIDE
const DIAL_ASPECT_TALL = 0.45;  // ...and at or below which it is DIAL_SPAN_TALL

/* Room at the sides for a name whose own width hangs past the ring, and a
   little under the hub. The side pad is a fraction of the field rather than a
   constant: 58px is a comfortable margin in a 1100px window and a fifth of a
   phone's, where it was taking more from the dial than the dial had left. */
const DIAL_PAD_X_FRAC = 0.052;
const DIAL_PAD_X_MAX = 58;
const DIAL_PAD_X_MIN = 12;
const DIAL_PAD_Y = 22;
/* THE THREE RINGS SIT CLOSE TOGETHER, high on the circle.
 *
 * They started spread over the outer half of it — names at 0.86, ratios at
 * 0.50 — which put a note's own ratio nearly 250px in from it at this size. On
 * a strip the two rows are a fixed distance apart and obviously one reading;
 * bent round a hub, the same radial gap fans them out, so at the ends of the
 * arc a ratio sat closer to its NEIGHBOUR's name than to its own. Packed into
 * a narrow band the pairing survives the bend, and the empty middle simply
 * becomes the space a dial has in the middle. */
const RING = { names: 0.95, ruler: 0.82, ratios: 0.70 };
/* THE NEEDLE IS A FULL SPOKE: from the hub, capped, to the top of the field.
 *
 * It ran for a while from just inside the ratios ring to just past the names,
 * with an arrowhead — the band the reading lives in and no more. But that
 * made it a pointer, and a pointer is read as the subject; drawn edge to hub
 * it is the strip's centre line bent round, a fixed axis the scale swings
 * under, which is what it is. NEEDLE_OUT is kept as the top of the band the
 * dial's geometry is fitted to; the line itself now runs past it to the edge. */
const NEEDLE_OUT = 1.06;

/* ---- the strip ---- */
const STRIP_GAP = 24;  // px between the names row, the ruler and the ratios

const MIN_SCALE = 0.05;       // floor for the density (anti-collision) scale
const MARK_GUTTER_PX = 5;     // min pixel gap kept between adjacent marks
// Tenney-height (log2(n*d)) size falloff: simpler ratios render larger. Slope
// is 3x the original 0.05 to exaggerate the simple-vs-complex contrast; the
// floor is lowered so complex ratios can shrink enough to let simple ones grow.
const COMPLEXITY_SLOPE = 0.1;
const COMPLEXITY_FLOOR = 0.05;
/* How much of that slope the Display drawer's slider lets through. 1 is the
   sizing above as it always was; 0 flattens it so every degree is one size;
   2 doubles the slope, so the simple ratios stand out of a dense scale like
   landmarks. Tetrads' Measure slider, for names instead of chords. */
const COMPLEXITY_DEFAULT = 1;
// Ups and Downs renders at one fixed size for every mark — never scaled by
// density, name length, complexity, enh equivalent, or exclude halves.
const EDO_SCALE = 0.55;

/* HOW BIG A NAME IS AT SCALE 1, in px.
 *
 * This was a constant — 4rem, the Output windows' own letter size — because
 * the meter lived in a card the size of an Output window. On the stage it is a
 * fraction of the field instead: the whole point of giving the tuner the
 * window was that a cent is worth more pixels here, and a name pinned at 51px
 * in a 700px-tall field would have thrown most of that back. Bounded at both
 * ends so a short window does not produce something unreadable and a very tall
 * one does not produce a single letter three hundred pixels high. */
const NAME_PX_FLOOR = 26;
const NAME_PX_CEIL = 190;
const RATIO_OF_NAME = 0.5;   // 2rem against 4rem, as the Output windows have it

let marks = [];           // [{deg, nameEl, rEl, dotEl, lineEl, complexity, fullWidth}]
let currentDegrees = [];
let isJiMode = true;
let latestFreq = null;    // smoothed frequency, or null before first detection
let baseScale = 1;        // density scale so adjacent marks don't collide
let rulerShape = null;    // what buildRuler last drew, so it is not redrawn per frame
let dialDash = null;      // {period, radius, half, dot} for the dial's cent ruler
let gridStep = 1;         // cents between the grid's lines, as buildRuler last drew it
let soundingMark = null;  // the mark whose pitch is being played, if one is

const el = (id) => document.getElementById(id);
const stage = () => el('tuner-stage');
const shape = () => (stage() ? stage().dataset.shape : 'linear');
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Total cents spanned across the meter (the tuner "zoom"), from the Settings
 *  drawer's Tuner Window Width field. Smaller = more zoomed in. */
function centsWindow() {
    const v = parseFloat(el('tunerCentsWindow') && el('tunerCentsWindow').value);
    return (v && v > 0) ? v : DEFAULT_CENTS_WINDOW;
}

/** The Display drawer's complexity strength, 0..2; 1 is the plain sizing. */
function complexityStrength() {
    const v = parseFloat(el('tunerComplexity') && el('tunerComplexity').value);
    return Number.isFinite(v) ? clamp(v, 0, 2) : COMPLEXITY_DEFAULT;
}

/** The number beside the slider: "off" at 0, otherwise the strength. */
function showComplexity() {
    const v = el('tunerComplexityValue');
    if (!v) return;
    const k = complexityStrength();
    v.textContent = k === 0 ? 'off' : `${k.toFixed(2)}×`;
}

/** The number beside the band slider, as the tolerance it is. */
function showInTune() {
    const v = el('tunerInTuneValue');
    if (v) v.textContent = `±${inTune().toFixed(1)}c`;
}

/** Paint the field by how far the nearest degree is, or wipe it. The colour
 *  goes on as a custom property and the rule in style.css mixes it into the
 *  ground, so the wash is the same tint in both themes. */
function paintField(absDelta) {
    const readout = el('tunerReadout');
    if (!readout) return;
    const c = el('tunerColor');
    const on = c && c.checked && absDelta != null;
    readout.classList.toggle('colored', !!on);
    if (on) readout.style.setProperty('--tune-color', tuneColorFor(absDelta));
    else readout.style.removeProperty('--tune-color');
}

export function initTuner() {
    if (!el('tunerLanguage')) return;

    el('tunerLanguage').addEventListener('change', () => { updateVisibility(); rebuildScale(); });
    el('tunerLimitType').addEventListener('change', () => { updateVisibility(); rebuildScale(); });
    el('tunerCustomScale').addEventListener('input', rebuildScale);
    ['tunerLimitValue', 'tunerMaxExp', 'tunerEdo'].forEach((id) =>
        el(id).addEventListener('input', rebuildScale));

    // Option toggles that re-name the current scale when changed. The last
    // three are the Settings drawer's Reading latches, shared with the output
    // windows; the meter reads them rather than keeping its own.
    ['tunerSagittalTypeDropdown', 'showEnharmonics', 'excludeHalves',
        'unofficialExtensions'].forEach((id) =>
        el(id).addEventListener('change', rebuildScale));

    // Complexity sizing only changes text scale, not the scale itself — but
    // each mark's factor is baked in at build, so the strength is re-applied
    // to the marks that exist before the refit.
    const cx = el('tunerComplexity');
    if (cx) {
        let k = null;
        try { k = parseFloat(localStorage.getItem(COMPLEXITY_STORE)); } catch (e) {}
        if (Number.isFinite(k)) cx.value = clamp(k, 0, 2);
        showComplexity();
        cx.addEventListener('input', () => {
            showComplexity();
            try { localStorage.setItem(COMPLEXITY_STORE, cx.value); } catch (e) {}
            for (const m of marks) m.complexity = complexityFactor(m.deg);
            refitTuner();
        });
    }

    // Window width (the "zoom") lives in the Settings drawer; re-fit on change.
    const cw = el('tunerCentsWindow');
    if (cw) cw.addEventListener('input', refitTuner);

    // Sagittal revo/evo: a mutually-exclusive toggle-button pair (revo
    // default), matching Sagittal Output's behavior.
    bindTogglePair('tunerSagittalRevoToggle', 'tunerSagittalEvoToggle');

    el('tunerToggleButton').addEventListener('click', toggleListening);

    initZoomGestures();

    // Which shape the meter was left in, restored before anything is drawn.
    let stored = null;
    try { stored = localStorage.getItem(SHAPE_STORE); } catch (e) {}
    if (stored === 'dial' || stored === 'linear') applyShape(stored);

    // ...and whether the grid was up. The latch is the source of truth once
    // restored; the store only remembers it across visits.
    const grid = el('tunerGrid');
    if (grid) {
        let g = null;
        try { g = localStorage.getItem(GRID_STORE); } catch (e) {}
        if (g === '1' || g === '0') grid.checked = g === '1';
        grid.addEventListener('change', () => {
            try { localStorage.setItem(GRID_STORE, grid.checked ? '1' : '0'); } catch (e) {}
            rulerShape = null; // the ruler is drawn with or without the grid
            refitTuner();
        });
    }

    // ...and whether the field was coloured. Same arrangement as the grid.
    const colour = el('tunerColor');
    if (colour) {
        let c = null;
        try { c = localStorage.getItem(COLOR_STORE); } catch (e) {}
        if (c === '1' || c === '0') colour.checked = c === '1';
        colour.addEventListener('change', () => {
            try { localStorage.setItem(COLOR_STORE, colour.checked ? '1' : '0'); } catch (e) {}
            renderFrame();
        });
    }

    // ...and how wide the band is. Redraws rather than refits: nothing moves
    // or resizes, only which marks and how much of the field are lit.
    const band = el('tunerInTune');
    if (band) {
        let b = null;
        try { b = parseFloat(localStorage.getItem(IN_TUNE_STORE)); } catch (e) {}
        if (Number.isFinite(b) && b > 0) band.value = b;
        showInTune();
        band.addEventListener('input', () => {
            showInTune();
            try { localStorage.setItem(IN_TUNE_STORE, band.value); } catch (e) {}
            renderFrame();
        });
    }

    /* The field is what everything is measured against, and it changes size for
       reasons this module cannot see: the drawer opening, the stage switching,
       the window resizing, a phone turning over. Watching the box itself
       catches all four, and catches them after the layout has settled rather
       than during a width transition. */
    const readout = el('tunerReadout');
    if (readout && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(refitTuner).observe(readout);
    }
    window.addEventListener('resize', refitTuner);

    updateVisibility();
    rebuildScale();
}

/** Draw the meter in the given shape. Called by the Shape switch in the
 *  drawer; the marks and the scale are untouched, only where they are put. */
export function setTunerShape(next) {
    if (next !== 'linear' && next !== 'dial') return;
    applyShape(next);
    try { localStorage.setItem(SHAPE_STORE, next); } catch (e) {}
    refitTuner();
}

function applyShape(next) {
    const st = stage();
    if (st) st.dataset.shape = next;
    for (const b of document.querySelectorAll('#tuner-shape-seg button')) {
        b.classList.toggle('on', b.dataset.v === next);
    }
    rulerShape = null; // force a rebuild: the ruler is drawn per shape
}

/** Re-measure and redraw. Cheap enough to call on any layout change. */
export function refitTuner() {
    if (!marks.length) return;
    computeBaseScale();
    renderFrame();
}

/* =====================================================================
 *  ZOOM — the window width, under the hand
 * =====================================================================
 *
 * How many cents the meter spans is the one setting anybody changes WHILE
 * playing. Coarse to find the note, then in to place it — and reaching into a
 * drawer to type a number, on a phone, with an instrument in the other hand,
 * is not a thing anyone will do twice. So the meter takes the gesture every
 * phone already has for exactly this: pinch out to see less and finer, pinch
 * in to see more.
 *
 * A trackpad's pinch arrives as a wheel event with ctrlKey set, and an
 * ordinary wheel over the meter has no other job — nothing here scrolls — so
 * both are taken as well, and the same reach works at a desk.
 *
 * It goes through the drawer's own field rather than round it. The input is
 * still where the value lives; the gesture writes it and fires the input event
 * the field already answers, so the drawer stays truthful about what the meter
 * is doing and there is one path to a refit rather than two.
 * ------------------------------------------------------------------ */

/** Set the window, clamped, and let everything that reads the field know. */
function setCentsWindow(value, { badge = false } = {}) {
    const input = el('tunerCentsWindow');
    if (!input) return;
    const next = clamp(value, WINDOW_MIN, WINDOW_MAX);
    // Whole cents where they are fine enough to be worth having, a decimal
    // once the window is tight enough for one to be visible.
    input.value = next >= 20 ? String(Math.round(next)) : (Math.round(next * 10) / 10).toFixed(1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (badge) showZoom(input.value);
}

let zoomBadgeTimer = null;
function showZoom(value) {
    const badge = el('tunerZoom');
    if (!badge) return;
    badge.textContent = `${value} ¢`;
    badge.classList.add('on');
    clearTimeout(zoomBadgeTimer);
    zoomBadgeTimer = setTimeout(() => badge.classList.remove('on'), ZOOM_BADGE_MS);
}

function initZoomGestures() {
    const field = el('tunerReadout');
    if (!field) return;

    /* Live touches, by pointer id. Two is a pinch; one is nothing, and three
       is somebody resting a hand on the screen — also nothing, rather than a
       wild reading taken from whichever two the map happened to hold. */
    const touches = new Map();
    let startSpan = 0;
    let startWindow = 0;

    const span = () => {
        const [a, b] = [...touches.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };

    field.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        /* Captured so a finger that wanders off the meter mid-pinch keeps
           reporting to it. An element can hold several pointers at once, which
           is the whole reason this is per-pointer rather than a flag. */
        try { field.setPointerCapture(e.pointerId); } catch (err) {}
        if (touches.size === 2) {
            startSpan = span();
            startWindow = centsWindow();
        }
    });

    field.addEventListener('pointermove', (e) => {
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size !== 2 || !startSpan) return;
        e.preventDefault();
        /* Fingers apart means a smaller window: you are pulling the scale open,
           so less of it fits. The ratio is taken against where the pinch
           STARTED rather than accumulated frame by frame, so the window comes
           back exactly where it was if you bring your fingers back. */
        setCentsWindow(startWindow * (startSpan / Math.max(1, span())), { badge: true });
    });

    const lift = (e) => {
        if (!touches.delete(e.pointerId)) return;
        if (touches.size < 2) startSpan = 0;
        // A third finger lifting can leave exactly two again: start afresh from
        // wherever those two now are, rather than from a span they never had.
        if (touches.size === 2) {
            startSpan = span();
            startWindow = centsWindow();
        }
    };
    field.addEventListener('pointerup', lift);
    field.addEventListener('pointercancel', lift);

    /* A trackpad pinch arrives with ctrlKey set and in a stream of small
       deltas; a wheel arrives in notches of about 120. So the two get their own
       gearing — a notch is worth roughly a tenth, a pinch is worth what the
       fingers say — and both feel like themselves rather than one being tuned
       until the other is unusable.

       deltaMode first, because the same physical notch is reported in pixels by
       some browsers and in LINES (about 3, meaning 3 x 16px) by others. Without
       normalising it, the gearing that suits one is imperceptible in the
       other. */
    field.addEventListener('wheel', (e) => {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
        const rate = e.ctrlKey ? 0.010 : 0.0008;
        setCentsWindow(centsWindow() * Math.exp(e.deltaY * unit * rate), { badge: true });
    }, { passive: false });
}

function bindTogglePair(idA, idB) {
    const a = el(idA);
    const b = el(idB);
    a.addEventListener('click', () => { a.classList.add('selected'); b.classList.remove('selected'); rebuildScale(); });
    b.addEventListener('click', () => { b.classList.add('selected'); a.classList.remove('selected'); rebuildScale(); });
}

const language = () => el('tunerLanguage').value;
const limitType = () => el('tunerLimitType').value;

/** Show/hide the settings that apply to the selected language & limit type. */
function updateVisibility() {
    const lang = language();
    const updown = lang === 'updown';
    const lt = limitType();

    el('tunerJiSettings').style.display = updown ? 'none' : '';
    el('tunerMaxExpField').style.display = (!updown && lt === 'prime') ? '' : 'none';
    el('tunerLimitField').style.display = (!updown && lt !== 'custom') ? '' : 'none';
    el('tunerCustomRow').style.display = (!updown && lt === 'custom') ? '' : 'none';

    // Ups and Downs: full-width EDO field.
    el('tunerEdoSettings').style.display = updown ? '' : 'none';

    // Sagittal-only: precision dropdown and revo/evo.
    el('tunerSagittalType').style.display = lang === 'sagittal' ? '' : 'none';
    el('tunerSagittalRevoRow').style.display = lang === 'sagittal' ? '' : 'none';

    // Complexity sizing applies to the three JI languages only.
    el('tunerComplexityRow').style.display = updown ? 'none' : '';
}

/** Rebuild the scale (degrees + names) and its DOM marks. */
function rebuildScale() {
    const lang = language();
    if (lang === 'updown') {
        isJiMode = false;
        const m = parseInt(el('tunerEdo').value, 10) || 41;
        currentDegrees = buildEdoDegrees(m, {
            showEnh: el('showEnharmonics').checked,
            excludeHalves: el('excludeHalves').checked,
        });
    } else {
        isJiMode = true;
        const scale = buildJiScale(limitType(), {
            limit: el('tunerLimitValue').value,
            maxExp: el('tunerMaxExp').value,
            custom: el('tunerCustomScale').value,
        });
        currentDegrees = nameJiDegrees(scale, lang, nameOptions(lang));
    }
    buildMarks();
}

/** Naming options for the current JI language, read from the control state. */
function nameOptions(lang) {
    if (lang === 'heji') {
        return { unofficialExtensions: el('unofficialExtensions').checked };
    }
    if (lang === 'sagittal') {
        return {
            precision: el('tunerSagittalTypeDropdown').value,
            useEvo: el('tunerSagittalEvoToggle').classList.contains('selected'),
            useUnicode: true,
            showEnh: el('showEnharmonics').checked,
        };
    }
    return {};
}

function nameMarkHtml(deg) {
    if (!isJiMode) {
        const sp = deg.name && deg.name.spellings;
        if (!sp || !sp.length) return `<span class="tuner-edo-note">n/a</span>`;
        // enh equivalent: stack the spellings vertically (no comma), centred so
        // the pair's centre sits where a single spelling's centre would.
        if (sp.length === 1) return edoSpellingHtml(sp[0]);
        return `<span class="tuner-edo-stack">`
            + sp.map((s) => `<span class="tuner-edo-spelling">${edoSpellingHtml(s)}</span>`).join('')
            + `</span>`;
    }
    if (language() === 'sagittal') {
        const sp = deg.name && deg.name.spellings;
        if (!sp || !sp.length) return `<span class="tuner-note-letter">n/a</span>`;
        // Single spelling renders exactly like HEJI (letter + em symbol as
        // direct children of the mark) so it scales identically; only the
        // enharmonic set uses the vertical stack.
        if (sp.length === 1) return sagittalSpellingHtml(sp[0]);
        return `<span class="tuner-sagittal-stack multi">`
            + sp.map((s) => `<span class="tuner-sagittal-spelling">${sagittalSpellingHtml(s)}</span>`).join('')
            + `</span>`;
    }
    if (!deg.name) return `<span class="tuner-note-letter">n/a</span>`;
    return `<span class="tuner-note-letter">${deg.name.letter}</span>${deg.name.html || ''}`;
}

function sagittalSpellingHtml(s) {
    return `<span class="tuner-note-letter">${s.letter}</span>`
        + `<span class="tuner-sag-symbol${s.unicode ? '' : ' ascii'}">${s.symbol}</span>`;
}

function edoSpellingHtml(s) {
    return `<span class="tuner-edo-note">${s.base}</span>`
        + `<span class="tuner-edo-acc">${s.acc}</span>`;
}

function ratioText(deg) {
    return isJiMode ? `${deg.num}/${deg.den}` : `${deg.step}`;
}

/** Create one name + ratio mark per degree (positions set every frame). */
function buildMarks() {
    const lanes = { names: el('tunerLaneNames'), ratios: el('tunerLaneRatios') };
    if (!lanes.names || !lanes.ratios) return;
    stopTunerNote(); // the mark it belonged to is about to be thrown away
    Object.values(lanes).forEach((l) => { l.innerHTML = ''; });

    marks = currentDegrees.map((deg) => {
        const nameEl = document.createElement('div');
        nameEl.className = 'tuner-mark';
        nameEl.innerHTML = nameMarkHtml(deg);
        lanes.names.appendChild(nameEl);

        const rEl = document.createElement('div');
        rEl.className = 'tuner-mark';
        rEl.textContent = ratioText(deg);
        lanes.ratios.appendChild(rEl);

        const mark = { deg, nameEl, rEl, dotEl: null, lineEl: null,
                       complexity: complexityFactor(deg), fullWidth: 8 };
        setMarkVisible(mark, false); // hidden until positioned by a live pitch

        // A name or its ratio, pressed, sounds the note it stands for.
        nameEl.addEventListener('click', () => toggleMarkSound(mark));
        rEl.addEventListener('click', () => toggleMarkSound(mark));
        return mark;
    });

    rulerShape = null; // the degree-dot count changed, so the ruler is stale
    computeBaseScale();
    renderFrame();
}

function setMarkVisible(m, visible) {
    const disp = visible ? '' : 'none';
    m.nameEl.style.display = disp;
    m.rEl.style.display = disp;
    if (m.dotEl) m.dotEl.style.display = disp;
    if (m.lineEl) m.lineEl.style.display = disp;
}

/* =====================================================================
 *  HEARING THE GOAL
 *
 *  Any name or ratio on the meter, pressed, sounds the pitch it stands for
 *  through the Play drawer's engine, and keeps sounding until it is pressed
 *  again, another is pressed, or the scale changes under it. The meter only
 *  ever shows where a pitch sits among the degrees; this is what one of those
 *  degrees actually sounds like, to aim at by ear as well as by eye.
 *
 *  It is sounded in the octave nearest the pitch coming in, so a cello hears
 *  its goal where a cello plays and a flute where a flute does, rather than
 *  everyone hearing it in 1/1's own octave.
 * ===================================================================== */

function targetFrequency(deg) {
    const ref = parseFloat(state.freq1to1) || 261.6256;
    let f = ref * Math.pow(2, deg.cents / 1200);
    if (latestFreq > 0) f *= Math.pow(2, Math.round(Math.log2(latestFreq / f)));
    return f;
}

function setMarkSounding(m, on) {
    if (!m) return;
    m.nameEl.classList.toggle('sounding', on);
    m.rEl.classList.toggle('sounding', on);
}

function toggleMarkSound(m) {
    if (soundingMark === m) { stopTunerNote(); return; }
    setMarkSounding(soundingMark, false);
    soundingMark = m;
    setMarkSounding(m, true);
    playFrequencies([targetFrequency(m.deg)], 0.2, 0.1);
    // The output windows' play buttons share the engine; let them know their
    // chord has been taken over, so none is left saying "stop".
    document.dispatchEvent(new CustomEvent('notation:tuner-play'));
}

/** Silence the note a mark is sounding, if one is. Also called by the output
 *  windows' own stop, since the engine is shared. */
export function stopTunerNote() {
    if (!soundingMark) return;
    setMarkSounding(soundingMark, false);
    soundingMark = null;
    stopAllFrequencies(0.2);
}

// A timed note lets go on its own (see setPlayDuration in audio-playback.js);
// the sound has already gone, so only the underline is taken off.
document.addEventListener('notation:playback-ended', () => {
    setMarkSounding(soundingMark, false);
    soundingMark = null;
});

function gridOn() {
    const g = el('tunerGrid');
    return !!(g && g.checked);
}

/* =====================================================================
 *  GEOMETRY — the one place the two shapes differ
 * ===================================================================== */

/**
 * Where everything goes, for the field as it currently measures.
 *
 * Both shapes report a `pxPerCent`, which is what the collision test below
 * spends: on the strip it is a distance along the field, on the dial it is a
 * distance along the names ring. That is the only number the sizing code
 * needs, which is why the sizing code does not know which shape it is in.
 *
 * @returns {object|null} null while the field has no size (a shut drawer, the
 *          other stage, the moment before first layout).
 */
function geometry() {
    const readout = el('tunerReadout');
    if (!readout) return null;
    const w = readout.clientWidth;
    const h = readout.clientHeight;
    if (!w || !h) return null;
    const cw = centsWindow();

    if (shape() === 'dial') {
        const t = clamp((DIAL_ASPECT_WIDE - w / h) / (DIAL_ASPECT_WIDE - DIAL_ASPECT_TALL), 0, 1);
        const spanDeg = DIAL_SPAN_WIDE + t * (DIAL_SPAN_TALL - DIAL_SPAN_WIDE);
        const half = (spanDeg / 2) * Math.PI / 180;
        const padX = clamp(w * DIAL_PAD_X_FRAC, DIAL_PAD_X_MIN, DIAL_PAD_X_MAX);
        const cx = w / 2;

        /* THE RING THAT HAS TO FIT IS THE NAMES', not the circle it is a
         * fraction of. Bounding the outer radius by the width instead left the
         * arc a third narrower than the field it was drawn in — nothing is
         * drawn at R except the needle's own tip, which points straight up and
         * so is bounded by the height, not the width.
         *
         * The height bound is on the BAND rather than on the circle, for the
         * same reason. What is drawn runs from the needle's tip at R down to
         * the ratios ring where the arc ends, at `rRatios·cos(half)` above the
         * hub — 0.75R of band for a circle of R — and the hub itself is below
         * all of it and now draws nothing. So the hub is put wherever it has
         * to be for that band to sit in the middle of the field, which is what
         * `cy` solves for, and it is allowed off the bottom edge if the field
         * is wide and short. */
        const bandFraction = NEEDLE_OUT - RING.ratios * Math.cos(half);
        const R = Math.max(60, Math.min(
            (w / 2 - padX) / (RING.names * Math.sin(half)),
            (h - 2 * DIAL_PAD_Y) / bandFraction));
        const cy = (h + R * (NEEDLE_OUT + RING.ratios * Math.cos(half))) / 2;
        const rNames = R * RING.names;
        const radPerCent = (2 * half) / cw;
        return {
            kind: 'dial', w, h, cx, cy, R, half, radPerCent,
            rNames, rRuler: R * RING.ruler, rRatios: R * RING.ratios,
            pxPerCent: rNames * radPerCent,
            // A name may take about a fifth of the radius: enough to fill the
            // gap between the names ring and the ruler under it, and no more.
            namePx: clamp(R * 0.17, NAME_PX_FLOOR, NAME_PX_CEIL),
        };
    }

    const namePx = clamp(h * 0.34, NAME_PX_FLOOR, NAME_PX_CEIL);

    /* THE THREE ROWS ARE SPACED BY WHAT THE NAMES ACTUALLY COME OUT AT, not by
     * what they are allowed to reach.
     *
     * namePx is a ceiling; the size a name is really drawn at is that times
     * the density scale, and the density scale is usually well under 1 —
     * eleven-odd-limit at a hundred cents across settles somewhere near a
     * third. Spacing the rows by the ceiling therefore left two bands of empty
     * field between three rows of small type, with the ratio row stranded a
     * long way under its own note. Spaced by the effective size they sit
     * together as one reading, whatever the scale and the window make of it. */
    const eff = isJiMode ? baseScale : EDO_SCALE;
    const nameBand = namePx * eff * 1.25;   // room for a HEJI accidental's ascender
    const ratioBand = namePx * RATIO_OF_NAME * eff * 1.3;
    const total = nameBand + STRIP_GAP * 2 + ratioBand;
    const top = (h - total) / 2;
    return {
        kind: 'linear', w, h, namePx,
        pxPerCent: w / cw,
        yNames: top + nameBand / 2,
        yRuler: top + nameBand + STRIP_GAP,
        yRatios: top + nameBand + STRIP_GAP * 2 + ratioBand / 2,
    };
}

/** A point on the dial, `r` from the hub at `theta` radians clockwise of up. */
function polar(g, r, theta) {
    return { x: g.cx + r * Math.sin(theta), y: g.cy - r * Math.cos(theta) };
}

/**
 * How many cents apart the ruler's dots are.
 *
 * One per cent is the honest ruler and the one worth having, but only while a
 * cent is worth enough pixels to be a dot rather than part of a line. Opened
 * out to half an octave or more — which the window width allows — a per-cent
 * ruler is a grey band, so the ruler thins to every 2, 5, 10 cents and so on
 * and stays a ruler.
 */
function dotStep(pxPerCent) {
    for (const s of [1, 2, 5, 10, 25, 50, 100]) if (pxPerCent * s >= 4) return s;
    return 100;
}

/** How many cents apart the grid's lines are: the same ladder as the dots,
 *  climbed further, so every line still lands on a dot. */
function lineStep(pxPerCent) {
    for (const s of [1, 2, 5, 10, 25, 50, 100]) if (pxPerCent * s >= GRID_MIN_PX) return s;
    return 100;
}

/** Tenney height (harmonic distance) size factor: simpler ratios -> larger.
 *  log2(n*d) == 0 for 1/1 (factor 1); complex ratios shrink toward the floor.
 *  EDO steps are all equal complexity (factor 1). */
function complexityFactor(deg) {
    if (isJiMode) {
        const hd = Math.log2(Math.max(1, deg.num * deg.den));
        return Math.max(COMPLEXITY_FLOOR,
            Math.min(1, 1 - hd * COMPLEXITY_SLOPE * complexityStrength()));
    }
    return 1;
}

/**
 * Density scale: measure each mark's full-size footprint, then find the
 * largest uniform scale at which no two adjacent degrees collide. Inter-degree
 * spacing is fixed (the whole field moves together), so this depends only on
 * the scale and on how many pixels a cent is worth — computed on build, on
 * resize and on a complexity change, not per frame. Each mark's footprint is
 * pre-shrunk by its complexity factor, letting simpler-heavy regions pack
 * larger.
 */
function computeBaseScale() {
    const g = geometry();
    if (!g || !marks.length) return; // hidden or unbuilt — recomputed when shown

    // Measure full-size (scale 1) content widths in one reflow.
    for (const m of marks) {
        m.nameEl.style.fontSize = g.namePx + 'px';
        m.rEl.style.fontSize = (g.namePx * RATIO_OF_NAME) + 'px';
        m.nameEl.style.display = 'inline-block';
        m.rEl.style.display = 'inline-block';
    }
    for (const m of marks) {
        m.fullWidth = Math.max(m.nameEl.offsetWidth, m.rEl.offsetWidth, 8);
    }
    for (const m of marks) setMarkVisible(m, false);

    const order = marks.slice().sort((a, b) => a.deg.cents - b.deg.cents);
    // Each mark's Tenney factor already carries the slider's strength (1 for
    // every mark at 0, and always 1 for an EDO), so there is no latch here.
    const cf = (m) => m.complexity;
    let scale = 1;
    for (let i = 0; i < order.length; i++) {
        const a = order[i];
        const b = order[(i + 1) % order.length];
        let gapCents = b.deg.cents - a.deg.cents;
        if (i === order.length - 1) gapCents += 1200; // wrap across the octave
        if (gapCents <= 0) continue;
        const need = (a.fullWidth * cf(a) + b.fullWidth * cf(b)) / 2 + MARK_GUTTER_PX;
        if (need > 0) scale = Math.min(scale, (gapCents * g.pxPerCent) / need);
    }
    baseScale = Math.max(MIN_SCALE, Math.min(1, scale));

    // Asked again rather than reusing `g`: on the strip the rows are spaced by
    // the scale that was just decided, so the geometry the ruler is drawn into
    // is not the one the measuring was done in.
    buildRuler(geometry());
}

/**
 * Draw the cent ruler and the needle.
 *
 * THE STRIP'S RULER IS A RUN OF CIRCLES AND THE DIAL'S IS A DOTTED STROKE, and
 * that is not two ways of doing one thing. The strip scrolls, which a single
 * transform on a group of circles does for free. The dial cannot: bending the
 * same trick round the hub would need the group rotated, and a group drawn
 * over a whole octave at the dial's own degrees-per-cent would wrap round the
 * hub several times over. So the dial's ruler is one arc whose stroke is a
 * dash pattern exactly one cent long, and "scrolling" it is a dash offset —
 * one number per frame, and no DOM at all. See renderFrame for the offset.
 */
function buildRuler(g) {
    const svg = el('tunerRuler');
    if (!svg) return;
    const grid = gridOn();
    const key = `${g.kind}|${g.w}|${g.h}|${centsWindow()}|${marks.length}|${baseScale.toFixed(4)}|${grid}`;
    if (rulerShape === key) return;
    rulerShape = key;

    svg.setAttribute('viewBox', `0 0 ${g.w} ${g.h}`);
    svg.setAttribute('width', g.w);
    svg.setAttribute('height', g.h);

    const f = (n) => n.toFixed(2);
    let defs = '';
    let gridLines = '';   // the cent lines, drawn behind everything else
    let body = '';
    if (g.kind === 'dial') {
        const step = dotStep(g.rRuler * g.radPerCent);

        /* THE DIAL'S GRID IS DRAWN RELATIVE TO THE NEEDLE, not to the scale.
         *
         * The strip can lay its lines at absolute cents and slide the lot,
         * because a strip has room off both ends. Round, the arc is only a
         * fraction of the circle and the window is a fraction of the octave,
         * so absolute cents wrap: at a hundred cents across a hundred and
         * twenty degrees, the cent three hundred away lands on the same spoke
         * as this one. So the spokes are laid at whole steps either side of
         * twelve o'clock, as if the pitch sat exactly on one, and each frame
         * the group is turned back by the fraction of a step the pitch is
         * past — see scrollRuler. Clipped to the arc's own wedge, so nothing
         * is drawn round the rest of the circle. */
        if (grid) {
            gridStep = lineStep(g.rRuler * g.radPerCent);
            const rIn = g.R * GRID_IN, rOut = g.R * GRID_OUT;
            const n = Math.ceil((centsWindow() / 2) / gridStep) + 1;
            for (let k = -n; k <= n; k++) {
                const th = k * gridStep * g.radPerCent;
                const a = polar(g, rIn, th), b = polar(g, rOut, th);
                gridLines += `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}"/>`;
            }
            const wi = polar(g, rIn, -g.half), wo = polar(g, rOut, -g.half);
            const ei = polar(g, rIn, g.half), eo = polar(g, rOut, g.half);
            defs += `<defs><clipPath id="tunerGridClip"><path d="M${f(wi.x)} ${f(wi.y)}`
                  + ` L${f(wo.x)} ${f(wo.y)} A ${f(rOut)} ${f(rOut)} 0 0 1 ${f(eo.x)} ${f(eo.y)}`
                  + ` L${f(ei.x)} ${f(ei.y)} A ${f(rIn)} ${f(rIn)} 0 0 0 ${f(wi.x)} ${f(wi.y)} Z"/>`
                  + `</clipPath></defs>`;
            gridLines = `<g id="tunerGridScroll" class="tuner-grid" clip-path="url(#tunerGridClip)">${gridLines}</g>`;
        }
        const period = g.rRuler * g.radPerCent * step;
        const a = polar(g, g.rRuler, -g.half);
        const b = polar(g, g.rRuler, g.half);
        const dot = 0.01; // a zero-length dash with a round cap is a circle
        dialDash = { period, dot, radius: g.rRuler, half: g.half,
                     perCent: g.rRuler * g.radPerCent };
        body += `<path id="tunerDotTrack" class="tuner-dot-track"`
             + ` d="M${a.x.toFixed(2)} ${a.y.toFixed(2)}`
             + ` A ${g.rRuler.toFixed(2)} ${g.rRuler.toFixed(2)} 0 0 1`
             + ` ${b.x.toFixed(2)} ${b.y.toFixed(2)}"`
             + ` stroke-width="1.8" stroke-dasharray="${dot} ${(period - dot).toFixed(3)}"/>`;

        /* The needle is a spoke: from the hub, where its cap sits, straight up
           through the rings to the top edge of the field — the strip's own
           centre line, bent round. It used to stop short at both ends, with
           an arrowhead at the names ring and its cap inside the ratios; the
           line through everything says twelve o'clock plainly enough, and the
           cap at the centre says what the arc is an arc of. In a wide, short
           field the hub is below the bottom edge, and the cap goes with it. */
        body += `<line class="tuner-needle" x1="${f(g.cx)}" y1="${f(g.cy)}"`
             + ` x2="${f(g.cx)}" y2="0"/>`
             + `<circle class="tuner-needle-head" cx="${f(g.cx)}"`
             + ` cy="${f(g.cy)}" r="4.5"/>`;
    } else {
        dialDash = null;
        const step = dotStep(g.pxPerCent);
        const pxPerCent = g.pxPerCent;
        const cy = g.yRuler.toFixed(1);
        // A little over one octave on each side, so the run stays covered at
        // any scroll offset (pitchFolded is in [0, 1200)).
        let dots = '';
        for (let c = -300 - (((-300) % step) + step) % step; c < 1500; c += step) {
            dots += `<circle cx="${(c * pxPerCent).toFixed(2)}" cy="${cy}" r="0.9"/>`;
        }
        // The grid's lines lie at absolute cents like the dots and ride the
        // same translation, so a line and its dot cannot come apart.
        if (grid) {
            gridStep = lineStep(pxPerCent);
            for (let c = -300 - (((-300) % gridStep) + gridStep) % gridStep; c < 1500; c += gridStep) {
                const x = f(c * pxPerCent);
                gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${g.h}"/>`;
            }
            gridLines = `<g id="tunerGridScroll" class="tuner-grid">${gridLines}</g>`;
        }
        body += `<g id="tunerRulerScroll">${dots}</g>`;
        body += `<line class="tuner-needle" x1="${(g.w / 2).toFixed(2)}" y1="0"`
             + ` x2="${(g.w / 2).toFixed(2)}" y2="${g.h}"/>`;
    }

    // One larger dot per scale degree, positioned per frame in renderFrame so
    // it sits under its own note (and turns blue in tune). Painted last so it
    // sits on top of the ruler. With the grid up, a line per degree as well —
    // through the whole field, under the dots and the needle, over the cent
    // lines — placed and coloured with its dot.
    let degreeDots = '';
    let degreeLines = '';
    for (let i = 0; i < marks.length; i++) {
        degreeDots += `<circle class="tuner-degree-dot" cx="-100" cy="-100" r="2.6"/>`;
        if (grid) degreeLines += `<line class="tuner-degree-line" x1="-100" y1="-100" x2="-100" y2="-100"/>`;
    }
    const clip = (grid && g.kind === 'dial') ? ' clip-path="url(#tunerGridClip)"' : '';
    svg.innerHTML = defs + gridLines
        + `<g id="tunerRulerDegreeLines"${clip}>${degreeLines}</g>`
        + body + `<g id="tunerRulerDegrees">${degreeDots}</g>`;

    const degEls = svg.querySelectorAll('#tunerRulerDegrees .tuner-degree-dot');
    const lineEls = svg.querySelectorAll('#tunerRulerDegreeLines .tuner-degree-line');
    marks.forEach((m, i) => {
        m.dotEl = degEls[i] || null;
        m.lineEl = lineEls[i] || null;
    });
}

/** Fold a cents difference into [-600, 600). */
function wrapCents(c) {
    return ((c + 600) % 1200 + 1200) % 1200 - 600;
}

const setAt = (elm, x, y) => {
    elm.style.left = x.toFixed(2) + 'px';
    elm.style.top = y.toFixed(2) + 'px';
};

/** Put one mark's name, ratio and ruler dot where `delta` cents off puts them. */
function place(m, g, delta) {
    if (g.kind === 'dial') {
        const theta = delta * g.radPerCent;
        const n = polar(g, g.rNames, theta);
        const r = polar(g, g.rRatios, theta);
        const d = polar(g, g.rRuler, theta);
        setAt(m.nameEl, n.x, n.y);
        setAt(m.rEl, r.x, r.y);
        if (m.dotEl) {
            m.dotEl.setAttribute('cx', d.x.toFixed(2));
            m.dotEl.setAttribute('cy', d.y.toFixed(2));
        }
        if (m.lineEl) {
            const a = polar(g, g.R * GRID_IN, theta), b = polar(g, g.R * GRID_OUT, theta);
            m.lineEl.setAttribute('x1', a.x.toFixed(2));
            m.lineEl.setAttribute('y1', a.y.toFixed(2));
            m.lineEl.setAttribute('x2', b.x.toFixed(2));
            m.lineEl.setAttribute('y2', b.y.toFixed(2));
        }
        return;
    }
    const x = g.w / 2 + delta * g.pxPerCent;
    setAt(m.nameEl, x, g.yNames);
    setAt(m.rEl, x, g.yRatios);
    if (m.dotEl) {
        m.dotEl.setAttribute('cx', x.toFixed(2));
        m.dotEl.setAttribute('cy', g.yRuler.toFixed(2));
    }
    if (m.lineEl) {
        m.lineEl.setAttribute('x1', x.toFixed(2));
        m.lineEl.setAttribute('x2', x.toFixed(2));
        m.lineEl.setAttribute('y1', '0');
        m.lineEl.setAttribute('y2', g.h.toFixed(2));
    }
}

/**
 * Scroll the cent ruler so the incoming pitch sits under the needle.
 *
 * The dial's half of this is the dash arithmetic promised in buildRuler. Path
 * length from the arc's start to the point `delta` cents off the needle is
 * `perCent·(delta + half/radPerCent)`, so an integer cent `n` lands at
 * `s = period·(n/step - pitch/step) + radius·half`. A dash pattern's k-th dash
 * begins at `k·period - offset`, so setting `offset = dot/2 + perCent·pitch -
 * radius·half` puts the middle of a dash on every whole cent — which is what
 * makes the dial's ruler line up with its degree dots rather than merely look
 * like a dotted arc.
 */
function scrollRuler(g, pitchFolded) {
    if (g.kind === 'dial') {
        const track = el('tunerDotTrack');
        if (!track || !dialDash) return;
        const { period, dot, radius, half, perCent } = dialDash;
        let offset = dot / 2 + perCent * pitchFolded - radius * half;
        offset = ((offset % period) + period) % period;
        track.setAttribute('stroke-dashoffset', offset.toFixed(3));

        // The grid's spokes sit at whole steps from twelve o'clock; turn them
        // back by however far past a step the pitch is, so each lands on its
        // absolute cent. Clockwise is positive both in polar() and in SVG.
        const spokes = el('tunerGridScroll');
        if (spokes) {
            const frac = ((pitchFolded % gridStep) + gridStep) % gridStep;
            const deg = -frac * g.radPerCent * 180 / Math.PI;
            spokes.setAttribute('transform', `rotate(${deg.toFixed(3)} ${g.cx.toFixed(2)} ${g.cy.toFixed(2)})`);
        }
        return;
    }
    const shift = `translate(${(g.w / 2 - pitchFolded * g.pxPerCent).toFixed(2)},0)`;
    const scroll = el('tunerRulerScroll');
    if (scroll) scroll.setAttribute('transform', shift);
    const lines = el('tunerGridScroll');
    if (lines) lines.setAttribute('transform', shift);
}

/** Position every mark for the current incoming pitch. */
function renderFrame() {
    const g = geometry();
    if (!g) return;

    const idle = el('tunerIdle');
    if (latestFreq == null) {
        if (idle) idle.style.display = '';
        showHud(null);
        paintField(null);
        return;
    }
    if (idle) idle.style.display = 'none';

    const half = centsWindow() / 2;
    const refFreq = parseFloat(state.freq1to1) || 261.6256;
    const pitchFolded = U.mod(1200 * Math.log2(latestFreq / refFreq), 1200);

    scrollRuler(g, pitchFolded);
    showHud(pitchFolded);

    // The strip runs off the edge of the field, so a mark a little past the
    // window is still worth drawing on its way out. The dial's arc simply
    // stops, and a mark carried past its end would be drawn out in the corner
    // of the field with nothing under it.
    const margin = g.kind === 'dial' ? 0 : 24;

    let nearest = Infinity; // how far the closest degree is, for the field
    for (const m of marks) {
        const delta = wrapCents(m.deg.cents - pitchFolded);
        if (Math.abs(delta) < nearest) nearest = Math.abs(delta);
        const visible = Math.abs(delta) <= half + margin;
        setMarkVisible(m, visible);
        if (!visible) continue;

        // Ups and Downs: one fixed size for every mark (uniform regardless of
        // density, name length, enh, exclude halves). JI scales per-mark by the
        // density (anti-collision) scale times the complexity (Tenney) scale.
        const s = isJiMode ? baseScale * m.complexity : EDO_SCALE;
        m.nameEl.style.fontSize = (g.namePx * s) + 'px';
        m.rEl.style.fontSize = (g.namePx * RATIO_OF_NAME * s) + 'px';

        place(m, g, delta);

        // In tune (within 4c): name, ratio/step and the ruler degree dot turn
        // fully blue; the three 2c steps either side ramp toward blue.
        const cls = tuneClassFor(Math.abs(delta));
        applyTuneClass(m.nameEl, cls);
        applyTuneClass(m.rEl, cls);
        applyTuneClass(m.dotEl, cls);
        applyTuneClass(m.lineEl, cls);
    }
    paintField(marks.length ? nearest : null);
}

/**
 * The two numbers the picture cannot say.
 *
 * The meter shows where the pitch sits AMONG THE DEGREES, which is what you
 * tune by; it does not say what the pitch actually is. Hz is the measurement,
 * and cents-from-1/1 is that same measurement in the app's own units — the
 * unit every output window and every ratio in the scale is already spoken in.
 */
function showHud(pitchFolded) {
    const f = el('tunerHudFreq');
    const c = el('tunerHudCents');
    if (!f || !c) return;
    if (pitchFolded == null || latestFreq == null) {
        f.textContent = '—';
        c.textContent = '—';
        return;
    }
    f.textContent = latestFreq.toFixed(1);
    c.textContent = pitchFolded.toFixed(1);
}

/** Mic callback: log-smooth the pitch, snapping on large jumps (new note). */
function onPitch(freq) {
    if (freq) {
        if (latestFreq == null || Math.abs(1200 * Math.log2(freq / latestFreq)) > 80) {
            latestFreq = freq;
        } else {
            latestFreq = latestFreq * Math.pow(freq / latestFreq, 0.35);
        }
    }
    renderFrame();
}

async function toggleListening() {
    const btn = el('tunerToggleButton');
    const idle = el('tunerIdle');
    if (Mic.isRunning()) {
        Mic.stop();
        stopTunerNote(); // the marks are about to go, and the goal with them
        latestFreq = null;
        marks.forEach((m) => setMarkVisible(m, false));
        showHud(null);
        paintField(null);
        btn.textContent = 'listen';
        btn.classList.remove('listening-active');
        idle.innerHTML = 'press <b>listen</b> to start';
        idle.style.display = '';
        return;
    }
    try {
        buildMarks();
        computeBaseScale();
        await Mic.start(onPitch);
        btn.textContent = 'stop';
        btn.classList.add('listening-active');
    } catch (e) {
        latestFreq = null;
        btn.textContent = 'listen';
        btn.classList.remove('listening-active');
        idle.textContent = 'microphone unavailable';
        idle.style.display = '';
    }
}
