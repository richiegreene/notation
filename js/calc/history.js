
import * as UI from './ui.js';

/**
 * Undo/redo for everything the user can enter.
 *
 * Deliberately headless: there is no button, no toolbar and no visible history
 * list. The only surface is the keyboard - Cmd/Ctrl+Z to undo, Cmd+Shift+Z or
 * Ctrl+Y to redo.
 *
 * Rather than instrumenting each of the app's many handlers, this works by
 * diffing snapshots. A snapshot is the value of every entry control plus which
 * palette buttons carry `.selected`; after any user event that changes one of
 * those, the previous snapshot is pushed onto the undo stack. That way a single
 * click that cascades through several fields (a "clear" button, an enumerated
 * chord expanding into chord fields, a mode switch regenerating columns) is
 * recorded as exactly one undoable step, with no extra bookkeeping.
 */

const HISTORY_LIMIT = 200;
// Consecutive keystrokes in the same field inside this window collapse into one
// undo step, so undo moves an edit at a time rather than a character at a time.
const COALESCE_MS = 700;

const FIELD_SELECTOR = 'input, select, textarea';

// Controls that are not part of the notated material: live audio/MIDI routing,
// and the Tuner, whose settings describe an ongoing mic analysis rather than
// anything entered. Undoing into them would be surprising.
const EXCLUDED_IDS = new Set(['playbackMode', 'midiOutputSelect', 's-family', 's-timbre']);
const EXCLUDED_ANCESTORS = '[data-drawer="tuner"], #tuner-stage';

let reapply = () => {};
let undoStack = [];
let redoStack = [];
let baseline = null;      // state as of the last recorded history entry
let applying = false;     // true while a snapshot is being written back
let coalesceKey = null;   // field whose consecutive edits are being merged
let coalesceTime = 0;
let pending = null;

function isTracked(el) {
    if (el.id && EXCLUDED_IDS.has(el.id)) return false;
    if (el.closest(EXCLUDED_ANCESTORS)) return false;
    return true;
}

/**
 * A stable identity for an element across snapshots. Ids where they exist
 * (every entry field and every dynamically generated ratio input has one);
 * otherwise the child-index path up to the nearest id, which is stable for the
 * static palettes and for the Johnston palette generated once at load.
 */
function keyFor(el) {
    if (el.id) return '#' + el.id;
    const parts = [];
    let node = el;
    while (node && node !== document.body) {
        const parent = node.parentElement;
        if (!parent) break;
        parts.unshift(Array.prototype.indexOf.call(parent.children, node));
        if (parent.id) {
            parts.unshift('#' + parent.id);
            break;
        }
        node = parent;
    }
    return parts.join('/');
}

function keyedElements(selector) {
    const map = new Map();
    document.querySelectorAll(selector).forEach(el => {
        if (isTracked(el)) map.set(keyFor(el), el);
    });
    return map;
}

function capture() {
    const fields = {};
    keyedElements(FIELD_SELECTOR).forEach((el, key) => {
        fields[key] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    });
    const selected = [];
    keyedElements('button').forEach((el, key) => {
        if (el.classList.contains('selected')) selected.push(key);
    });
    return { fields, selected };
}

function same(a, b) {
    return a && b && JSON.stringify(a) === JSON.stringify(b);
}

function restore(snap) {
    applying = true;
    try {
        // The dynamic ratio fields are rebuilt first: the snapshot's chord size
        // and stacking amount decide how many inputs exist, and the values below
        // have to land in the rebuilt inputs.
        const chordSize = snap.fields['#chord-size-input'];
        if (chordSize !== undefined) {
            document.getElementById('chord-size-input').value = chordSize;
            UI.generateChordRatioFields(parseInt(chordSize, 10) || 1);
        }
        const stacking = snap.fields['#stacking-input'];
        if (stacking !== undefined) {
            document.getElementById('stacking-input').value = stacking;
            UI.generateStackingRatioFields(parseInt(stacking, 10) || 0);
        }

        const fields = keyedElements(FIELD_SELECTOR);
        for (const key in snap.fields) {
            const el = fields.get(key);
            if (!el) continue;
            const value = snap.fields[key];
            if (el.type === 'checkbox' || el.type === 'radio') el.checked = value;
            else el.value = value;
        }

        const selected = new Set(snap.selected);
        keyedElements('button').forEach((el, key) => {
            el.classList.toggle('selected', selected.has(key));
        });

        reapply();
    } finally {
        applying = false;
    }
    // Record what is actually on screen, which is what a redo has to return to
    // if the caller undoes again from here.
    baseline = capture();
    coalesceKey = null;
}

function record(key) {
    if (applying) return;
    const snap = capture();
    if (same(snap, baseline)) return;

    const now = Date.now();
    const merging = key !== null && key === coalesceKey && (now - coalesceTime) < COALESCE_MS;
    if (!merging) {
        undoStack.push(baseline);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    }
    redoStack.length = 0;
    baseline = snap;
    coalesceKey = key;
    coalesceTime = now;
}

// The app's own handlers run synchronously during dispatch, so the snapshot is
// taken on the next task, once every field the action touched has settled.
function scheduleRecord(key) {
    if (applying) return;
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
        pending = null;
        record(key);
    }, 0);
}

function undo() {
    if (!undoStack.length) return;
    redoStack.push(baseline);
    restore(undoStack.pop());
}

function redo() {
    if (!redoStack.length) return;
    const snap = redoStack.pop();
    undoStack.push(baseline);
    restore(snap);
}

/**
 * @param {object} options
 * @param {Function} options.reapply - Pushes the current DOM state back through
 *   the calculation pipeline. Restoring a snapshot writes many fields at once
 *   without firing their change handlers, so this stands in for all of them.
 */
export function initHistory(options) {
    reapply = options.reapply;
    baseline = capture();

    // Typing coalesces per field; everything else (commits, clicks, dropdowns)
    // is its own step.
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!(el instanceof Element) || !isTracked(el)) return;
        scheduleRecord(keyFor(el));
    }, true);

    ['change', 'click'].forEach(type => {
        document.addEventListener(type, (e) => {
            const el = e.target;
            if (!(el instanceof Element) || !isTracked(el)) return;
            scheduleRecord(null);
        }, true);
    });

    document.addEventListener('keydown', (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
        const key = e.key.toLowerCase();
        const isUndo = key === 'z' && !e.shiftKey;
        const isRedo = (key === 'z' && e.shiftKey) || (key === 'y' && !e.metaKey);
        if (!isUndo && !isRedo) return;

        // Inside a field the app does not track (the Tuner's custom scale), the
        // browser's own text undo is the more useful behaviour.
        const active = document.activeElement;
        if (active && active.matches(FIELD_SELECTOR) && !isTracked(active)) return;

        e.preventDefault();
        // Any half-typed edit becomes its own step before moving through history.
        if (pending) {
            clearTimeout(pending);
            pending = null;
            record(coalesceKey);
        }
        if (isUndo) undo();
        else redo();
    }, true);
}
