import { state } from './state.js';
import * as U from './utils.js';
import { buildJiScale, nameJiDegrees, buildEdoDegrees } from './tuner-notation.js';
import * as Mic from '../tuner-mic.js';

/**
 * Tuner window controller.
 *
 * Wires the language / limit controls, drives mic pitch detection, and renders
 * the horizontal strobe strip: a fixed centre line is the incoming pitch, and
 * scale degrees glide past it positioned by their cents distance. Note name,
 * ratio (or EDO step), Hz and cents-from-1/1 each get a lane.
 *
 * 1/1 = C for spelling; Hz / cents use the app-wide 1/1 frequency
 * (state.freq1to1). The mic is only opened when the user presses the toggle.
 */

const CENTS_WINDOW = 300; // total cents spanned across the strip (±150)
const IN_TUNE = 4;        // cents within which a note name turns blue

let marks = [];           // [{deg, nameEl, rEl, hEl, cEl}]
let currentDegrees = [];
let isJiMode = true;
let latestFreq = null;    // smoothed frequency, or null before first detection

const el = (id) => document.getElementById(id);

export function initTuner() {
    if (!el('tunerLanguage')) return;

    el('tunerLanguage').addEventListener('change', () => { updateVisibility(); rebuildScale(); });
    el('tunerLimitType').addEventListener('change', () => { updateVisibility(); rebuildScale(); });
    el('tunerCustomScale').addEventListener('input', rebuildScale);
    ['tunerLimitValue', 'tunerMaxExp', 'tunerEdo'].forEach((id) =>
        el(id).addEventListener('input', rebuildScale));

    // Option toggles that re-name the current scale when changed.
    ['tunerSagittalTypeDropdown', 'tunerShowEnharmonics', 'tunerExcludeHalves',
        'tunerUnofficialExtensions', 'tunerSagittalShowEnharmonics'].forEach((id) =>
        el(id).addEventListener('change', rebuildScale));

    // Sagittal revo/evo: a mutually-exclusive toggle-button pair (revo default),
    // matching Sagittal Output's behavior.
    bindTogglePair('tunerSagittalRevoToggle', 'tunerSagittalEvoToggle');

    el('tunerToggleButton').addEventListener('click', toggleListening);

    updateVisibility();
    rebuildScale();
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

    // Ups and Downs: full-width EDO field + its enh/exclude-halves checks.
    el('tunerEdoSettings').style.display = updown ? '' : 'none';
    el('tunerEdoChecks').style.display = updown ? '' : 'none';

    // Sagittal-only: precision dropdown (top) and enh + revo/evo (below readout).
    el('tunerSagittalType').style.display = lang === 'sagittal' ? '' : 'none';
    el('tunerSagittalChecks').style.display = lang === 'sagittal' ? '' : 'none';

    // HEJI-only: unofficial extensions toggle (below readout).
    el('tunerHejiChecks').style.display = lang === 'heji' ? '' : 'none';
}

/** Rebuild the scale (degrees + names) and its DOM marks. */
function rebuildScale() {
    const lang = language();
    if (lang === 'updown') {
        isJiMode = false;
        const m = parseInt(el('tunerEdo').value, 10) || 41;
        currentDegrees = buildEdoDegrees(m, {
            showEnh: el('tunerShowEnharmonics').checked,
            excludeHalves: el('tunerExcludeHalves').checked,
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
        return { unofficialExtensions: el('tunerUnofficialExtensions').checked };
    }
    if (lang === 'sagittal') {
        return {
            precision: el('tunerSagittalTypeDropdown').value,
            useEvo: el('tunerSagittalEvoToggle').classList.contains('selected'),
            useUnicode: true,
            showEnh: el('tunerSagittalShowEnharmonics').checked,
        };
    }
    return {};
}

function nameMarkHtml(deg) {
    if (!isJiMode) {
        return `<span class="tuner-edo-note">${deg.name.base}</span>`
            + `<span class="tuner-edo-acc">${deg.name.acc}</span>`;
    }
    if (language() === 'sagittal') {
        const sp = deg.name && deg.name.spellings;
        if (!sp || !sp.length) return `<span class="tuner-note-letter">n/a</span>`;
        return `<span class="tuner-sagittal-stack${sp.length > 1 ? ' multi' : ''}">`
            + sp.map((s) => `<span class="tuner-sagittal-spelling">`
                + `<span class="sagittal-letter">${s.letter}</span>${s.symbolHtml}</span>`).join('')
            + `</span>`;
    }
    if (!deg.name) return `<span class="tuner-note-letter">n/a</span>`;
    return `<span class="tuner-note-letter">${deg.name.letter}</span>${deg.name.html || ''}`;
}

function ratioText(deg) {
    return isJiMode ? `${deg.num}/${deg.den}` : `${deg.step}\\${deg.edo}`;
}

/** Create one mark per degree in each lane (positions set every frame). */
function buildMarks() {
    const lanes = {
        names: el('tunerLaneNames'),
        ratios: el('tunerLaneRatios'),
        hz: el('tunerLaneHz'),
        cents: el('tunerLaneCents'),
    };
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

        const hEl = document.createElement('div');
        hEl.className = 'tuner-mark';
        lanes.hz.appendChild(hEl);

        const cEl = document.createElement('div');
        cEl.className = 'tuner-mark';
        lanes.cents.appendChild(cEl);

        const mark = { deg, nameEl, rEl, hEl, cEl };
        setMarkVisible(mark, false); // hidden until positioned by a live pitch
        return mark;
    });
}

function setMarkVisible(m, visible) {
    const disp = visible ? '' : 'none';
    m.nameEl.style.display = disp;
    m.rEl.style.display = disp;
    m.hEl.style.display = disp;
    m.cEl.style.display = disp;
}

/** Fold a cents difference into [-600, 600). */
function wrapCents(c) {
    return ((c + 600) % 1200 + 1200) % 1200 - 600;
}

/** Position every mark for the current incoming pitch. */
function renderFrame() {
    const readout = el('tunerReadout');
    if (!readout) return;

    if (latestFreq == null) { el('tunerIdle').style.display = ''; return; }
    el('tunerIdle').style.display = 'none';

    const width = readout.clientWidth || 240;
    const pxPerCent = width / CENTS_WINDOW;
    const half = CENTS_WINDOW / 2;
    const refFreq = parseFloat(state.freq1to1) || 261.6256;

    const pitchCentsAbs = 1200 * Math.log2(latestFreq / refFreq);
    const pitchFolded = U.mod(pitchCentsAbs, 1200);

    for (const m of marks) {
        const delta = wrapCents(m.deg.cents - pitchFolded);
        const visible = Math.abs(delta) <= half + 24;
        setMarkVisible(m, visible);
        if (!visible) continue;

        const leftPx = width / 2 + delta * pxPerCent;
        for (const e of [m.nameEl, m.rEl, m.hEl, m.cEl]) e.style.left = leftPx + 'px';

        // The degree in the incoming pitch's octave: cents above 1/1, and Hz.
        const absCents = pitchCentsAbs + delta;
        const degFreq = refFreq * Math.pow(2, absCents / 1200);
        m.hEl.textContent = degFreq.toFixed(1);
        m.cEl.textContent = (absCents > 0 ? '+' : '') + absCents.toFixed(0);
        m.nameEl.classList.toggle('in-tune', Math.abs(delta) <= IN_TUNE);
    }
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
    if (Mic.isRunning()) {
        Mic.stop();
        latestFreq = null;
        marks.forEach((m) => setMarkVisible(m, false));
        btn.textContent = 'on';
        btn.classList.remove('listening-active');
        el('tunerIdle').textContent = 'press on to start listening';
        el('tunerIdle').style.display = '';
        return;
    }
    try {
        buildMarks();
        await Mic.start(onPitch);
        btn.textContent = 'off';
        btn.classList.add('listening-active');
    } catch (e) {
        latestFreq = null;
        btn.textContent = 'on';
        btn.classList.remove('listening-active');
        el('tunerIdle').textContent = 'microphone unavailable';
        el('tunerIdle').style.display = '';
    }
}
