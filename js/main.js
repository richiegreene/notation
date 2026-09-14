import * as C from './calc/constants.js';
import * as U from './calc/utils.js';
import { state } from './calc/state.js';
import * as Calc from './calc/calculator.js';
import * as UI from './calc/ui.js';
import { generateJohnstonPalette, generateJohnstonOutputColumns } from './calc/johnston.js';
import { initAudio, playFrequencies, stopAllFrequencies, setTimbre, setAdsr, setPlayDuration,
         DEFAULT_TIMBRE, DEFAULT_ADSR } from './audio-playback.js'; // Import audio functions
import { createTimbrePicker } from './synth/timbre.js'; // The Play drawer's wave picker
import { attachAdsrEditor } from './synth/adsr.js';     // ...and its envelope editor
import { initMidiOutput, setPlaybackMode, midiOutputSelect, midiDeviceSelectorDiv } from './mpe-playback.js'; // Import MPE functions
import { initTuner, setTunerShape, refitTuner, stopTunerNote } from './calc/tuner.js'; // Import Tuner stage controller
import { initHistory } from './calc/history.js'; // Import undo/redo history

let slideDuration = 0.25; // Default slide duration, can be made configurable

// --- Masonry layout for the reorderable cards -------------------------------
// The .calc-container grid uses 1px row tracks (see style.css). Each card's
// grid-row span is set to its real pixel height plus a uniform vertical gap, so
// cards stack tightly and consistently beneath one another no matter how the
// user reorders, collapses, or resizes them.
const MASONRY_VGAP = 8; // px of vertical space left below each card

function layoutMasonry() {
    const container = document.querySelector('.calc-container');
    if (!container) return;
    // The cards are display:none while the Tuner stage is up, so every card
    // measures zero and every span would collapse to 1. Nothing is laid out
    // that cannot be seen; coming back to the stage relayouts.
    if (!container.clientWidth) return;
    container.querySelectorAll('.settings-menu-item').forEach(item => {
        // With align-items:start the card keeps its natural content height
        // regardless of how many row tracks it spans, so this is the true height.
        const height = item.getBoundingClientRect().height;
        const span = Math.max(1, Math.ceil(height) + MASONRY_VGAP);
        item.style.gridRowEnd = 'span ' + span;
    });
}

let masonryFrame = null;
function scheduleMasonry() {
    if (masonryFrame) return;
    masonryFrame = requestAnimationFrame(() => {
        masonryFrame = null;
        layoutMasonry();
    });
}

function initMasonry(container) {
    layoutMasonry();
    // A card changing size (content update, collapse/expand, media-query width
    // change) triggers a coalesced relayout.
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(scheduleMasonry);
        container.querySelectorAll('.settings-menu-item').forEach(item => ro.observe(item));
    }
    window.addEventListener('resize', scheduleMasonry);
    // Re-run once fonts/images settle after initial paint.
    window.addEventListener('load', scheduleMasonry);
}

// Functions that need to be globally accessible from HTML
window.loadCurrentPitch = function(index) {
    if (index === undefined) { // This is for the static "saved" ratio's load button
        state.savedNum = state.displayNumValue;
        state.savedDen = state.displayDenValue;
        $("#savedNum").val(state.savedNum);
        $("#savedDen").val(state.savedDen);
        Calc.getSavedInputSum();
    } else { // This is for dynamically generated ratios
        $(`#inputNum_${index}`).val(state.displayNumValue);
        $(`#inputDen_${index}`).val(state.displayDenValue);
        performCalculationsAndStopPlayback();
    }
}

window.clearRatio = function(index) {
    $(`#inputNum_${index}`).val(1);
    $(`#inputDen_${index}`).val(1);
    performCalculationsAndStopPlayback();
}

window.clearRatio1 = function() {
	state.savedNum = 1;
	state.savedDen = 1;
	state.savedInputSum = C.reference;
	$("#savedNum").val(state.savedNum);
	$("#savedDen").val(state.savedDen);
	Calc.getSavedInputSum();
	// Bang the output windows to 1/1 and stop any stale playback, matching
	// every other clear button in the app (clearRatio, clearChordRatio, clearAllIntervals).
	performCalculationsAndStopPlayback();
}

window.getCurrentPitch = function() {
	window.loadCurrentPitch(); // Call loadCurrentPitch without an index for the static saved ratio
}

window.loadCurrentPitchToChord = function(index) {
    $(`#chordInputNum_${index}`).val(state.displayNumValue);
    $(`#chordInputDen_${index}`).val(state.displayDenValue);
    performCalculationsAndStopPlayback();
}

window.clearChordRatio = function(index) {
    $(`#chordInputNum_${index}`).val(1);
    $(`#chordInputDen_${index}`).val(1);
    performCalculationsAndStopPlayback();
}

window.clearAllIntervals = function() {
    // Blank any entered ratios so this "clear" fully resets. (The size/stacking
    // fields otherwise preserve their values across the count changes below.)
    $("#dynamic-ratio-fields-container input.ratioIn, #chord-ratio-fields-container input.ratioIn").val(1);

    // Reset Interval Entry fields
    $("#stacking-input").val(1);
    $("#stacking-input").trigger("change");

    // Reset Chord Entry fields
    $("#chord-size-input").val(1);
    $("#chord-size-input").trigger("change");

    // Clear Enumerated Chord Entry field
    $("#enumerated-chord-input").val("");
    $("#enumerated-chord-input").trigger("input");

    // Reset EDO Approximation input
    $("#edoApproximationInput").val(41);

    // Clear EDO output
    clearEdoOutput();

    // Reset HEJI Entry fields and trigger calculations
    sendA();
}

// Function to clear the Ups and Downs (EDO) Output window
window.clearEdoOutput = function() {
    // Iterate through all existing EDO output columns and clear their dynamic content
    // The number of columns is determined by the current chord size input
    const numColumns = effectiveColumnCount();
    for (let i = 1; i <= numColumns; i++) {
        $(`#edoNoteName_${i}`).text("");
        $(`#edoNotationOutput_${i}`).text("");
        $(`#edoStepDistance_${i}`).text("");
        $(`#edoCentDeviation_${i}`).text("0"); // Set to "0" instead of empty
        $(`#edoFrequency_${i}`).text("440"); // Set to "440" instead of empty
        $(`#edoJIgross_${i}`).text("0"); // Set to "0" instead of empty
    }
    // Also stop any playing EDO frequencies if they are active
    if (isPlayingEdo) {
        stopAllFrequencies(0.1);
        isPlayingEdo = false;
        $("#playEdoOutputButton").text("play").removeClass("playing-active");
    }

    // Trigger a re-calculation to re-populate EDO output with default values
    // This mimics the behavior when clearAllIntervals is used.
    performCalculationsAndStopPlayback();
}

window.sendA = function() {
	$("#chordInput").click(); // Trigger Chord Entry as default

	$("#default3").click();
	$("#default5").click();
	$("#default7").click();
	$("#default11").click();
	$("#default13").click();
	$("#default17").click();
	$("#default19").click();
	$("#default23").click();
	$("#default29").click();
	$("#default31").click();
	$("#default37").click();
	$("#default41").click();
	$("#default43").click();
	$("#default47").click();
	$("#default53").click();
	$("#default59").click();
	$("#default61").click();
	$("#default67").click();
	$("#default71").click();
	$("#default73").click();
	$("#default79").click();
	$("#default83").click();
	$("#default89").click();
	// Reset every Johnston palette row to its natural (value 3). Set directly
	// rather than clicking, so this does not fire a recalculation per row.
	$(".johnston-button").removeClass("selected");
	$(".johnston-button[value='3']").addClass("selected");
	performCalculationsAndStopPlayback();
	Calc.getFrequency1to1();
	Calc.getFrequencyKammerTon();
	window.getCurrentPitch();
	UI.getBend();
	//getEDOSteps();
}

// Function to apply the theme from localStorage or default to dark
function applyStoredTheme() {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
        document.documentElement.setAttribute("data-theme", storedTheme);
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
    }
}

let isPlaying = false;
let isPlayingEdo = false; // New state for EDO playback
let isPlayingSagittal = false; // New state for Sagittal playback
let isPlayingJohnston = false; // New state for Johnston playback

// Stop playback in every output window: fade out the audio and reset all
// play-state flags and button visuals, so only one window can play at a time.
function stopAllPlayback(fadeTime) {
    if (isPlaying || isPlayingEdo || isPlayingSagittal || isPlayingJohnston) {
        stopAllFrequencies(fadeTime);
    }
    stopTunerNote(); // the tuner's goal note shares the engine
    resetPlayButtons();
}

// Every output window's play button back to "play", without touching the
// sound: for when the sound has already gone — stopped, taken over by the
// tuner, or let go on its own at the end of a timed note.
function resetPlayButtons() {
    isPlaying = false;
    isPlayingEdo = false;
    isPlayingSagittal = false;
    isPlayingJohnston = false;
    $("#playOutputButton, #playEdoOutputButton, #playSagittalOutputButton, #playJohnstonOutputButton")
        .text("play").removeClass("playing-active");
}

// New function to perform calculations and stop playback
function performCalculationsAndStopPlayback() {
    Calc.doCalc(); // Perform the original calculation
    stopAllPlayback(0.1);
}

// The number of output columns the current (active) entry area produces: the
// multi-note chord layout while Chord Entry is active, otherwise a single
// column. Everything that iterates output columns (doCalc, the output-column
// generators, and every playback/save loop) uses this so an inactive entry
// area never affects what the output windows show or play.
function effectiveColumnCount() {
    return $("#chordInput").prop("checked") ? (parseInt($("#chord-size-input").val()) || 1) : 1;
}

// Regenerate the output windows (HEJI, Ups-and-Downs, Sagittal, Johnston) to the
// active area's column count and recalculate. Deliberately does NOT touch Chord
// Entry's own ratio fields, so activating an area preserves whatever was typed.
function refreshOutputColumns() {
    const numColumns = effectiveColumnCount();
    UI.generateOutputColumns(numColumns);
    UI.generateEdoOutputColumns(numColumns);
    UI.generateSagittalOutputColumns(numColumns);
    generateJohnstonOutputColumns(numColumns);
    performCalculationsAndStopPlayback();
}

// Pull the Interval Entry ratio (field 1) from the DOM into state. Called when
// Interval Entry is activated so a ratio typed while it was inactive is shown.
function syncIntervalStateFromInputs() {
    const num = parseInt($("#inputNum_1").val());
    const den = parseInt($("#inputDen_1").val());
    if (!isNaN(num) && num > 0) state.savedNum = num;
    if (!isNaN(den) && den > 0) state.savedDen = den;
    Calc.getSavedInputSum();
}

// Push the whole entry area back through the calculation pipeline. Every
// control normally reaches `state` through its own change handler; undo/redo
// writes many fields at once without firing any of them, so this stands in for
// all of them and then rebuilds the output windows.
function applyAllFromInputs() {
    state.precision = $("#precision").val();
    state.edoQuantisation = parseInt($("#edoApproximationInput").val());
    // Both frequency fields are restored as they were displayed, so neither is
    // recomputed from the other here (which would be wrong in unlinked mode).
    state.kammerTon = parseFloat($("#frequencyA4").val());
    state.freq1to1 = parseFloat($("#1to1Frequency").val());

    // Interval Entry's first ratio field is the saved ratio.
    syncIntervalStateFromInputs();

    // Show/hide rules that the controls' own handlers otherwise maintain.
    $(".unofficial-extension-row").toggle($("#unofficialExtensions").prop("checked"));
    if ($("#chord-entry-type-select").val() === 'enumerated-chord') {
        $("#enumerated-chord-entry").show();
        $("#note-by-note-entry").hide();
    } else {
        $("#enumerated-chord-entry").hide();
        $("#note-by-note-entry").show();
    }

    refreshOutputColumns();
    UI.getPC();
    UI.getBend();
}

// Function to generate and download CSV for HEJI Output
function saveHejiOutputAsCsv() {
    generateCsvAndDownload(state.outputFrequencies, "heji_output.csv");
}

// Function to generate and download CSV for Ups and Downs (EDO) Output
function saveEdoOutputAsCsv() {
    generateCsvAndDownload(state.edoOutputFrequencies, "edo_output.csv");
}

// Function to generate and download CSV for Sagittal Output
function saveSagittalOutputAsCsv() {
    generateCsvAndDownload(state.sagittalOutputFrequencies, "sagittal_output.csv");
}

// Function to generate and download CSV for Johnston Output
function saveJohnstonOutputAsCsv() {
    generateCsvAndDownload(state.johnstonOutputFrequencies, "johnston_output.csv");
}

/**
 * Generates a CSV string from frequency data and triggers a download.
 * @param {object} frequencies - An object where keys are column indices and values are frequencies.
 * @param {string} filename - The desired filename for the CSV.
 */
function generateCsvAndDownload(frequencies, filename) {
    const timeDomainRate = 0.1; // 0.1 seconds per step
    const duration = 8.0; // 8 seconds total
    const amplitude = 0.25; // Fixed amplitude

    let csvContent = "time,frequency,amplitude,harmonic_index\n";
    const numSteps = Math.floor(duration / timeDomainRate);

    // Collect all frequencies and sort them to determine harmonic_index
    const activeFrequencies = Object.values(frequencies).filter(freq => freq !== undefined && freq > 0);
    activeFrequencies.sort((a, b) => a - b); // Sort frequencies ascending

    for (let i = 0; i <= numSteps; i++) {
        const time = (i * timeDomainRate).toFixed(6); // Format time to 6 decimal places

        activeFrequencies.forEach((freq, index) => {
            csvContent += `${time},${freq.toFixed(6)},${amplitude.toFixed(6)},${index}\n`;
        });
    }

    downloadCsv(csvContent, filename);
}

/**
 * Helper function to trigger a file download in the browser.
 * @param {string} content - The content of the file.
 * @param {string} filename - The name of the file to download.
 */
function downloadCsv(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // Feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


/* =====================================================================
 *  THE RAIL — two stages and three drawers
 * =====================================================================
 *
 * Models' and Keyboard Designer's rail, with one addition those two do not
 * need: this app has two things to look at rather than one, so the rail holds
 * STAGES as well as DRAWERS and the two behave differently.
 *
 *   A DRAWER is a set of controls beside whatever you are looking at.
 *   Pressing the one you are in shuts it and gives the stage its width back;
 *   pressing another switches to it. Settings and Play act on both stages —
 *   the 1/1 a name is measured from is the 1/1 the tuner reads against — so
 *   changing stage never shuts them.
 *
 *   A STAGE is what the window is showing, and there is exactly one.
 *
 *   TUNER IS BOTH, and that is not a compromise: its drawer is settings for
 *   its stage and for nothing else, so wanting one without the other on the
 *   way in is not a thing anybody wants. Pressing it takes you there and
 *   opens them; pressing it again shuts the drawer and leaves you on the
 *   meter with the whole window, which is how you actually use it.
 * ------------------------------------------------------------------ */
function setupPanel() {
    const panel = document.getElementById('panel');
    const main = document.getElementById('main');
    if (!panel || !main) return;

    const drawerButtons = panel.querySelectorAll('.rail-btn[data-drawer]');
    const stageButtons = panel.querySelectorAll('.rail-btn[data-stage]');

    /** Which drawer is up, or null if the panel is shut. */
    const openDrawer = () => {
        if (!panel.classList.contains('open')) return null;
        const d = panel.querySelector('.drawer:not(.hidden)');
        return d ? d.dataset.drawer : null;
    };

    const setDrawer = (name) => {
        for (const d of panel.querySelectorAll('.drawer')) {
            d.classList.toggle('hidden', d.dataset.drawer !== name);
        }
        for (const b of drawerButtons) {
            b.setAttribute('aria-expanded', String(b.dataset.drawer === name));
        }
        panel.classList.toggle('open', !!name);
        afterLayout();
    };

    const setStage = (name) => {
        main.dataset.stage = name;
        for (const b of stageButtons) b.classList.toggle('on', b.dataset.stage === name);
        afterLayout();
    };

    /* The panel's width is animated, so what a measurement taken now would
       find is a width that is on its way somewhere. Both things that measure
       are asked again when it lands — and both also watch their own boxes, so
       a transition that never fires (a browser with animations off, a stage
       switched while the panel was already still) costs nothing. */
    function afterLayout() {
        scheduleMasonry();
        refitTuner();
    }
    panel.addEventListener('transitionend', (e) => {
        if (e.propertyName === 'width') afterLayout();
    });

    for (const btn of panel.querySelectorAll('.rail-btn[data-drawer], .rail-btn[data-stage]')) {
        btn.addEventListener('click', () => {
            const stage = btn.dataset.stage;
            const drawer = btn.dataset.drawer;

            if (stage && drawer) {          // Tuner — see the header above
                if (main.dataset.stage !== stage) {
                    setStage(stage);
                    setDrawer(drawer);
                } else {
                    setDrawer(openDrawer() === drawer ? null : drawer);
                }
            } else if (stage) {             // Notation
                setStage(stage);
                // The tuner's options are settings for a stage you have left.
                if (openDrawer() === 'tuner') setDrawer(null);
            } else {                        // Settings, Play
                setDrawer(openDrawer() === drawer ? null : drawer);
            }
        });
    }

    /* ON A NARROW WINDOW THE DRAWER STARTS SHUT.
       The markup opens on Settings, which is right at a desk: the drawer is
       340px of a wide window and the cards still have most of it. On a phone
       held upright that same 340px is nearly the whole screen, and the app
       would open on its settings with the thing they are settings for reduced
       to a strip. Measured in geometry rather than by pointer type, because it
       is the width that is the problem. */
    if (window.matchMedia('(max-width: 900px), (max-height: 500px)').matches) {
        setDrawer(null);
    }

    /* AND A HANDHELD STARTS ON THE TUNER.
       The nine cards are a desk: they are for building a chord and reading it
       four ways, with a keyboard to type ratios into. A phone is a music stand
       — it is carried to the instrument, and the thing it is carried there FOR
       is the meter. Opening on the cards makes every one of those visits begin
       with two presses before a note can be heard.

       Asked of the pointer as well as the width, because this is a claim about
       how the device is HELD rather than about how much room it has: a narrow
       desktop window is still a desk with a keyboard, and it keeps the cards.
       Nothing is hidden either way — the rail is right there, and the choice is
       one press. */
    if (window.matchMedia('(pointer: coarse) and (max-width: 1100px)').matches) {
        setStage('tuner');
    }
}


/* =====================================================================
 *  THE PLAY DRAWER'S TWO DRAWN CONTROLS
 * =====================================================================
 *
 * Models' and Keyboard Designer's own picker and ADSR editor, built from the
 * same modules (js/synth/timbre.js, js/synth/adsr.js), so the family list and
 * the slider's range are written in by createTimbrePicker rather than spelled
 * out in this app's markup and the three cannot come to offer different
 * shapes. What replaced a single slider and a drawn SVG of the wave: the
 * slider is still there, but it now crosses two families of synthesis and the
 * note it makes has an envelope you can take hold of.
 * ------------------------------------------------------------------ */
const SYNTH_STORE = 'notation.synth.v1';

let synthPicker = null;
let synthAdsrEditor = null;
let synthState = { timbre: DEFAULT_TIMBRE, adsr: { ...DEFAULT_ADSR } };

/** The colours the two canvases are drawn in: Models' and Keyboard
 *  Designer's own, literal for literal, in both themes. The scopes are
 *  instrument screens with their own ground (--scope-bg) rather than a
 *  surface of the chrome, so the trace is the mint the other two draw it in
 *  and not the chrome's blue, and it does not change with the theme. */
function synthColours() {
    return { line: '#7ee0c0', axis: '#222a34', grid: '#1b222b' };
}

/** Redraw both canvases — after a theme change, or once they have a size. */
function repaintSynthCanvases() {
    if (synthPicker) synthPicker.refresh();
    if (synthAdsrEditor) synthAdsrEditor.redraw();
}

function saveSynth() {
    try { localStorage.setItem(SYNTH_STORE, JSON.stringify(synthState)); } catch (e) {}
}

function loadSynth() {
    try {
        const raw = localStorage.getItem(SYNTH_STORE);
        if (!raw) return;
        const v = JSON.parse(raw);
        if (typeof v.timbre === 'number') synthState.timbre = v.timbre;
        if (v.adsr && ['a', 'd', 's', 'r'].every((k) => typeof v.adsr[k] === 'number')) {
            synthState.adsr = v.adsr;
        }
    } catch (e) {}
}

/* HOW LONG A PRESSED NOTE SOUNDS — the Play drawer's Duration switch.
 *
 * Indefinite is what every play button always did: sound until pressed
 * again. Seconds hands the stopping to the engine (see setPlayDuration in
 * js/audio-playback.js), which is what lets the envelope's release be heard
 * at all without a second press, and what lets a note sounded from the tuner
 * get out of the mic's way on its own. Remembered with the rest of the
 * drawer, since it is a fact about how the app sounds. */
const DURATION_STORE = 'notation.play.duration.v1';

function setupDurationControl() {
    const seg = document.getElementById('playDurationSeg');
    const row = document.getElementById('playDurationSecondsRow');
    const secs = document.getElementById('playDurationSeconds');
    if (!seg || !row || !secs) return;

    let mode = 'hold';
    try {
        const v = JSON.parse(localStorage.getItem(DURATION_STORE) || 'null');
        if (v && (v.mode === 'hold' || v.mode === 'seconds')) mode = v.mode;
        if (v && typeof v.seconds === 'number' && v.seconds > 0) secs.value = v.seconds;
    } catch (e) {}

    const apply = () => {
        const s = parseFloat(secs.value);
        const seconds = mode === 'seconds' && s > 0 ? s : 0;
        setPlayDuration(seconds);
        row.style.display = mode === 'seconds' ? '' : 'none';
        for (const b of seg.querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === mode);
        try { localStorage.setItem(DURATION_STORE, JSON.stringify({ mode, seconds: s > 0 ? s : 2 })); } catch (e) {}
    };

    $(seg).find('button').on('click', function() { mode = this.dataset.v; apply(); });
    $(secs).on('input change', apply);
    apply();
}

function setupSynthDrawer() {
    const el = (id) => document.getElementById(id);
    if (!el('s-family')) return;
    if (!synthPicker) loadSynth(); // only on the way in, not on a rebuild

    synthPicker = createTimbrePicker(
        { family: el('s-family'), slider: el('s-timbre'), ticks: el('s-ticks'),
          label: el('s-label'), canvas: el('s-wave') },
        {
            value: synthState.timbre,
            ...synthColours(),
            onInput: (v) => { synthState.timbre = v; setTimbre(v); },
            onChange: saveSynth,
        },
    );

    /** The four numbers under the curve, in the units they are set in. */
    function showAdsr() {
        const e = synthState.adsr;
        const ms = (v) => (v >= 1 ? `${v.toFixed(2)} s` : `${Math.round(v * 1000)} ms`);
        el('s-a').textContent = `A ${ms(e.a)}`;
        el('s-d').textContent = `D ${ms(e.d)}`;
        el('s-s').textContent = `S ${Math.round(e.s * 100)}%`;
        el('s-r').textContent = `R ${ms(e.r)}`;
    }

    synthAdsrEditor = attachAdsrEditor(
        el('s-adsr'),
        () => synthState.adsr,
        (next) => { synthState.adsr = next; setAdsr(next); showAdsr(); saveSynth(); },
        synthColours(),
    );

    setTimbre(synthState.timbre);
    setAdsr(synthState.adsr);
    showAdsr();

    /* A canvas has no size until it is laid out, and one in a drawer that is
       shut has none at all — so both are drawn again whenever they get one. */
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(repaintSynthCanvases);
        ro.observe(el('s-wave'));
        ro.observe(el('s-adsr'));
    }
}

/* THE THEME CHANGED, SO THE TWO CANVASES HAVE TO BE BUILT AGAIN.
 *
 * Everything else in the app follows a token change on its own, because
 * everything else is CSS. These two are painted — the picker and the editor
 * are handed a line colour and an axis colour once, at construction, and they
 * keep them for every later redraw. Repainting with fresh colours would fix
 * the picture until the next drag, which would come out in the old ones.
 *
 * So the drawer is made again rather than repainted, and the canvases are
 * replaced with clones of themselves first: attachAdsrEditor listens on the
 * canvas node, and a second editor on the same node would run every drag
 * twice. A clone carries the markup and none of the listeners, which is the
 * shortest way to say "this control is new". The values survive because they
 * live in synthState, not in either module.
 */
function rebuildSynthDrawer() {
    for (const id of ['s-wave', 's-adsr']) {
        const old = document.getElementById(id);
        if (old) old.replaceWith(old.cloneNode(false));
    }
    setupSynthDrawer();
}

$(document).ready(function(){
    applyStoredTheme(); // Apply theme on load
    setupPanel();       // The rail: two stages, three drawers

    // Theme toggle functionality. The wave and the envelope are painted into
    // canvases rather than styled by CSS, so unlike everything else in the app
    // they do not follow a token change on their own — they are redrawn here.
    $("#theme-toggle").on("click", function() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        rebuildSynthDrawer();
    });

    // Keyboard shortcut to toggle save buttons visibility
    $(document).on('keydown', function(e) {
        // Check for Cmd+Shift+S (macOS) or Ctrl+Shift+S (Windows/Linux)
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault(); // Prevent the browser's default save dialog
            $(".save-csv-button").toggleClass("show-save-button");
        }
    });

    // Event listeners for the new save buttons
    $("#saveHejiOutputButton").on("click", function() {
        saveHejiOutputAsCsv();
    });

    $("#saveEdoOutputButton").on("click", function() {
        saveEdoOutputAsCsv();
    });

    $("#saveSagittalOutputButton").on("click", function() {
        saveSagittalOutputAsCsv();
    });

    $("#saveJohnstonOutputButton").on("click", function() {
        saveJohnstonOutputAsCsv();
    });

    // Build the Johnston Entry palette before any calculation reads it.
    generateJohnstonPalette();

    // Wire up the Tuner stage (mic stays closed until its toggle is pressed).
    initTuner();
    // A note sounded from the tuner takes the engine from whichever output
    // window had it; the window's button goes back to "play" without a stop
    // of its own, which would silence the tuner's note. A timed note ending
    // is the same story: the sound has already gone.
    document.addEventListener('notation:tuner-play', resetPlayButtons);
    document.addEventListener('notation:playback-ended', resetPlayButtons);

    setupDurationControl();

    // Straight or round, from the Tuner drawer. A segmented pair rather than a
    // checkbox because these are two alternatives, not a thing that is on.
    $("#tuner-shape-seg button").on("click", function() {
        setTunerShape(this.dataset.v);
    });

	state.kammerTon = $("#frequencyA4").val();
	state.precision = $("#precision").val();
    state.edoQuantisation = $("#edoApproximationInput").val(); // Initialize edoQuantisation
	sendA();
	UI.getPC();
    UI.generateEdoOutputColumns(parseInt($("#chord-size-input").val())); // Generate initial EDO output columns
    UI.generateSagittalOutputColumns(parseInt($("#chord-size-input").val()));
    generateJohnstonOutputColumns(parseInt($("#chord-size-input").val()));
    // Trigger the change event on edoApproximationInput to force a recalculation and update
    // of all EDO output columns upon page load, mimicking the user's successful interaction.
    $("#edoApproximationInput").trigger("change");


    initAudio(); // Bring the voice engine up (silent until a note is asked for)
    setupSynthDrawer(); // The Play drawer's wave picker and envelope editor

    // Playback Mode change listener.
    //
    // The Synth fieldset is shown whenever the browser's own engine is part of
    // what is sounding, which now includes "Both" — the MIDI device has its own
    // sound and the browser's wave still applies to the browser's half.
    $("#playbackMode").on("change", async function() {
        const selectedMode = $(this).val();
        setPlaybackMode(selectedMode); // Update the global playback mode in mpe-playback.js

        const usesMidi = selectedMode === 'mpe-midi' || selectedMode === 'both';
        const usesBrowser = selectedMode !== 'mpe-midi';

        if (usesMidi) {
            await initMidiOutput(); // Initialize MIDI when a MIDI mode is selected
            if (midiDeviceSelectorDiv) midiDeviceSelectorDiv.style.display = 'flex';
        } else if (midiDeviceSelectorDiv) {
            midiDeviceSelectorDiv.style.display = 'none';
        }
        $("#synth-fieldset").toggle(usesBrowser);
        if (usesBrowser) repaintSynthCanvases(); // it had no size while hidden

        stopAllFrequencies(0.1); // Nothing carries over a change of route
        performCalculationsAndStopPlayback(); // Recalculate and stop any playing sounds
    });

	$("#octaveDropdown").change(function(c){
		Calc.getFrequency1to1();
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#diatonicNoteDropdown").change(function(c){
		Calc.getFrequency1to1();
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#refAccidentalDropdown").change(function(c){
		Calc.getFrequency1to1();
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#hejiOctaveDropdown").change(function(c){
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#hejiDiatonicNoteDropdown").change(function(c){
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#johnstonOctaveDropdown, #johnstonDiatonicNoteDropdown").change(function(c){
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	// The Johnston palette is generated at runtime, so its buttons are bound by
	// delegation. Each row keeps exactly one selection, like the HEJI palette.
	$(document).on("click", ".johnston-button", function(c){
		const row = $(this).data("johnston-row");
		$(`.johnston-${row}`).removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$(".refOctave").click(function(c){
		$(".refOctave").removeClass("selected");
		$(this).addClass("selected");
		Calc.getFrequency1to1();
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$(".refNote").click(function(c){
		$(".refNote").removeClass("selected");
		$(this).addClass("selected");
		Calc.getFrequency1to1();
		performCalculationsAndStopPlayback();
		UI.getPC();
	});


	$(".accidental").click(function(c){
		$(".accidental").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	});

	$(".chromatic").click(function(c){
		$(".chromatic").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$(".syntonic").click(function(c){
		$(".syntonic").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".septimal").click(function(c){
		$(".septimal").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".undecimal").click(function(c){
		$(".undecimal").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".tridecimal").click(function(c){
		$(".tridecimal").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".seventeen").click(function(c){
		$(".seventeen").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".nineteen").click(function(c){
		$(".nineteen").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".twentyThree").click(function(c){
		$(".twentyThree").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".twentyNine").click(function(c){
		$(".twentyNine").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".thirtyOne").click(function(c){
		$(".thirtyOne").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".thirtySeven").click(function(c){
		$(".thirtySeven").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".fortyOne").click(function(c){
		$(".fortyOne").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".fortyThree").click(function(c){
		$(".fortyThree").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".fortySeven").click(function(c){
		$(".fortySeven").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".fiftyThree").click(function(c){
		$(".fiftyThree").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".fiftyNine").click(function(c){
		$(".fiftyNine").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".sixtyOne").click(function(c){
		$(".sixtyOne").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".sixtySeven").click(function(c){
		$(".sixtySeven").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".seventyOne").click(function(c){
		$(".seventyOne").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".seventyThree").click(function(c){
		$(".seventyThree").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".seventyNine").click(function(c){
		$(".seventyNine").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".eightyThree").click(function(c){
		$(".eightyThree").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$(".eightyNine").click(function(c){
		$(".eightyNine").removeClass("selected");
		$(this).addClass("selected");
		performCalculationsAndStopPlayback();
		UI.getPC();
	}); 
	$("#num").change(function(c){
		state.numValue = $(this).val();
		Calc.getCentDeviation();
		UI.getPC();
	});
	$("#den").change(function(c){
		state.denValue = $(this).val();
		Calc.getCentDeviation();
		UI.getPC();
	});
	
	$("#frequencyA4").change(function(c){
		state.kammerTon = $(this).val();
		if ($("#refFrequencyLinkedRadio").prop("checked")){
			Calc.getFrequency1to1();
		}
		Calc.getCentDeviation();
		UI.getPC(); 
	});
	$("#1to1Frequency").change(function(c){
		state.freq1to1 = $(this).val();
		if ($("#refFrequencyLinkedRadio").prop("checked")){
			Calc.getFrequencyKammerTon();
		}
		Calc.getOutputFrequency();
		Calc.getCentDeviation();
		UI.getPC(); 
	});
	$("#edoQuantisation").change(function(c){
		state.edoQuantisation = $(this).val();
		$("#edoSize").text(state.edoQuantisation);
		$("#edoSizeMelodic").text(state.edoQuantisation);
		//getEDOSteps();
	});
	$("#savedNum").change(function(c){
		state.savedNum = parseInt($(this).val());
		Calc.getSavedInputSum();
	});
	$("#savedDen").change(function(c){
		state.savedDen = parseInt($(this).val());
		Calc.getSavedInputSum();
	});

    // Input type radio buttons
	// Activating an entry area shows a single output column and reflects that
	// area's current input. Chord Entry's size/fields are left untouched so they
	// reappear intact if Chord Entry is reactivated.
	$("#paletteInput").click(function(c){
		refreshOutputColumns();
		UI.getPC();
	});
	$("#intervalInput").click(function(c){
		// Pick up any ratio typed while this area was inactive, then display it.
		syncIntervalStateFromInputs();
		refreshOutputColumns();
		UI.getPC();
	});
	$("#sagittalEntryInput").click(function(c){
		refreshOutputColumns();
		UI.getPC();
	});
	$("#johnstonInput").click(function(c){
		refreshOutputColumns();
		UI.getPC();
	});
    $("#chordInput").click(function(c){
        // Reapply the current Chord Entry input so activating it shows the chord.
        if ($("#chord-entry-type-select").val() === 'enumerated-chord') {
            // Recompute size + ratio fields from the enumerated text (now active).
            $("#enumerated-chord-input").trigger('input');
        } else {
            // Note-by-note: expand output to the chord size, keeping typed fields.
            refreshOutputColumns();
        }
        performCalculationsAndStopPlayback();
        UI.getPC();
    });


	// The Reading latches in the Settings drawer. Each acts on every output
	// window at once (the tuner listens to them itself, in tuner.js).
	$("#octaveReduce, #showEnharmonics, #excludeHalves").on("change", function(c){
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	// Unofficial extensions: shows/hides the prime rows 53-89 in HEJI Entry,
	// and limits HEJI Output to the official 47 limit when unchecked.
	$("#unofficialExtensions").on("change", function() {
		$(".unofficial-extension-row").toggle(this.checked);
		performCalculationsAndStopPlayback();
		UI.getPC();
	});
	$("#bendParameter").change(function(c){
		UI.getBend();
	});
	$('#filterall').change(function(c){
		$('.filterstroke').prop("checked", this.checked);
	});
	$("#refFrequencyLinkedRadio").click(function(c){
		Calc.getFrequencyKammerTon();
		Calc.getOutputFrequency();
		//getEDOSteps();
		Calc.getCentDeviation();
		UI.getPC();
	})
	$("#precision").change(function(c){
		state.precision = $(this).val();
		performCalculationsAndStopPlayback();
    });
    
	$("#sibeliusRange").change(function(c){
		state.sibeliusRange = $(this).val();
		UI.getBend();
    });
	$("#midiRange").change(function(c){
		state.midiRange = $(this).val();
		UI.getBend();
    });

    // EDO Approximation input
    $("#edoApproximationInput").on("change", function() {
        state.edoQuantisation = parseInt($(this).val());
        performCalculationsAndStopPlayback();
    });

    // Sagittal Output controls
    $("#sagittalTypeDropdown").on("change", function() {
        performCalculationsAndStopPlayback();
    });

    // Evo/Revo and ASCII/Unicode behave as mutually exclusive toggle-button pairs:
    // clicking one selects it and deselects its partner; exactly one is always selected.
    function bindSagittalTogglePair(idA, idB) {
        $(idA).on("click", function() {
            $(idA).addClass("selected");
            $(idB).removeClass("selected");
            performCalculationsAndStopPlayback();
        });
        $(idB).on("click", function() {
            $(idB).addClass("selected");
            $(idA).removeClass("selected");
            performCalculationsAndStopPlayback();
        });
    }
    bindSagittalTogglePair("#sagittalEvoToggle", "#sagittalRevoToggle");
    bindSagittalTogglePair("#sagittalAsciiToggle", "#sagittalUnicodeToggle");

    // Sagittal Entry controls
    bindSagittalTogglePair("#sagittalEntryRevoToggle", "#sagittalEntryEvoToggle");
    $("#sagittalEntryTypeDropdown, #sagittalEntryNoteDropdown, #sagittalEntryOctaveDropdown").on("change", function() {
        performCalculationsAndStopPlayback();
    });
    $("#sagittalEntryAccidentalInput").on("input", function() {
        performCalculationsAndStopPlayback();
    });

    // Collapsible menu functionality
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        let headerToClick = item.querySelector('.toggle-header-placement') || item.querySelector('.settings-header');
        let toggleIconSpan = item.querySelector('.toggle-icon');

        const content = item.querySelector('.settings-content');

        if (!headerToClick || !toggleIconSpan) {
            return; 
        }

        // Initial state: cards carrying .collapsed-item in the HTML start
        // minimized; all others start expanded. The triangle stays visible in
        // both states; the .collapsed class rotates it to point at the header.
        toggleIconSpan.textContent = '▼';
        if (item.classList.contains('collapsed-item')) {
            headerToClick.classList.add('collapsed');
            content.style.display = 'none';
        } else {
            headerToClick.classList.remove('collapsed');
            content.style.display = 'grid';
        }

        headerToClick.addEventListener('click', () => {
            const isCollapsed = headerToClick.classList.toggle('collapsed');
            if (isCollapsed) {
                content.style.display = 'none';
                item.classList.add('collapsed-item');
            } else {
                content.style.display = 'grid';
                item.classList.remove('collapsed-item');
            }
        });
    });

    // Initialize SortableJS for drag-and-drop
    var el = document.querySelector('.calc-container');
    var sortable = Sortable.create(el, {
        animation: 150,
        handle: '.settings-header, .toggle-header-placement',
        ghostClass: 'sortable-ghost',
        onEnd: layoutMasonry
    });

    // Recompute the masonry layout after every drag, whenever a card's content
    // resizes (collapse/expand, chord-size change, mode switch, etc.), and on
    // window resize (which changes the column count via the media queries).
    initMasonry(el);

    // Prevent clicks on radio buttons and their labels from collapsing/expanding the section
    $('.toggle-header-placement input[type="radio"]').on('click', function(event) {
        event.stopPropagation();
    });

    $('.toggle-header-placement label').on('click', function(event) {
        event.stopPropagation();
    });

    $("#chord-size-input").change(function() {
        let numFields = parseInt($(this).val()) || 1;
        // Chord Entry's own note-by-note fields always mirror the requested size.
        UI.generateChordRatioFields(numFields);
        // Output columns follow the active area (1 unless Chord Entry is active),
        // so editing Size while Chord Entry is inactive never alters the output.
        refreshOutputColumns();
    });

    $("#stacking-input").change(function() {
        let numStackingFields = $(this).val();
        UI.generateStackingRatioFields(numStackingFields);
        // Only recalculate when Interval Entry is the active area.
        if ($("#intervalInput").prop("checked")) {
            performCalculationsAndStopPlayback();
        }
    });

    // Initial setup
    $("#chord-size-input").trigger("change");
    $("#stacking-input").trigger("change");
    clearRatio1();
    // Simulate the "Send default 12" bang at initialization of app
    $("#edoApproximationInput").trigger("change");
    
    // Listen for changes to dynamically created ratio inputs in Interval Entry mode
    $(document).on('dynamicRatioChanged', function() {
        console.log('dynamicRatioChanged event triggered');
        // When a dynamic ratio input changes in Interval Entry mode, read from inputNum_1/inputDen_1
        // and update state.savedNum/state.savedDen for compatibility with calculations
        if ($("#intervalInput").prop("checked")) {
            const num1 = parseInt($("#inputNum_1").val());
            const den1 = parseInt($("#inputDen_1").val());
            
            if (!isNaN(num1) && !isNaN(den1) && num1 > 0 && den1 > 0) {
                console.log('Updating state from dynamic inputs:', num1, '/', den1);
                state.savedNum = num1;
                state.savedDen = den1;
                Calc.getSavedInputSum();
            }
        }
    });

    // Event listener for the chord entry type dropdown
    $("#chord-entry-type-select").change(function() {
        const selectedType = $(this).val();
        if (selectedType === 'enumerated-chord') {
            $("#enumerated-chord-entry").show();
            $("#note-by-note-entry").hide();
        } else {
            $("#enumerated-chord-entry").hide();
            $("#note-by-note-entry").show();
        }
        // Trigger a calculation when switching modes
        $("#enumerated-chord-input").trigger('input');
    });

    function parseEnumeratedSequence(input) {
        const trimmed = (input || "").trim();

        if (!trimmed) {
            return { parts: [], denominator: 1 };
        }

        function parseParts(expression) {
            const normalized = (expression || "").trim();
            if (!normalized) {
                return [];
            }

            if (normalized.includes('::')) {
                const rangeParts = normalized.split('::').map(s => parseInt(s.trim(), 10));
                if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
                    const start = rangeParts[0];
                    const end = rangeParts[1];
                    const sequence = [];
                    if (start <= end) {
                        for (let i = start; i <= end; i++) {
                            sequence.push(i);
                        }
                    }
                    return sequence;
                }
                return [];
            }

            return normalized
                .split(':')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !isNaN(s))
                .map(s => parseInt(s, 10));
        }

        const parenthesizedMatch = trimmed.match(/^\((.+)\)\s*(?:\/(\d+))?$/);
        const slashMatch = trimmed.match(/^(.*)\s*\/(\d+)$/);

        if (parenthesizedMatch) {
            return {
                parts: parseParts(parenthesizedMatch[1]),
                denominator: parenthesizedMatch[2] !== undefined ? (parseInt(parenthesizedMatch[2], 10) || 1) : 1
            };
        }

        if (slashMatch) {
            return {
                parts: parseParts(slashMatch[1]),
                denominator: parseInt(slashMatch[2], 10) || 1
            };
        }

        const parts = parseParts(trimmed);
        return {
            parts,
            denominator: parts.length > 0 && parts[0] !== 0 ? parts[0] : 1
        };
    }

    function calculateEnumeratedChord() {
        // Chord Entry only drives the output while it is the active area. When
        // inactive, the typed text is left in the field and applied on activation.
        if (!$("#chordInput").prop("checked")) return;
        const input = $("#enumerated-chord-input").val();
        const { parts, denominator } = parseEnumeratedSequence(input);

        const baseNum = parseInt($("#enumerated-base-num").val(), 10) || 1;
        const baseDen = parseInt($("#enumerated-base-den").val(), 10) || 1;

        if (parts.length > 0) {
            if (denominator === 0) return; // Avoid division by zero

            const chordSize = parts.length;

            // Update chord size and generate fields
            $("#chord-size-input").val(chordSize).trigger('change');

            parts.forEach((part, index) => {
                const numerator = part;

                // Multiply by the base ratio
                const finalNum = numerator * baseNum;
                const finalDen = denominator * baseDen;

                const reduced = U.reduce(finalNum, finalDen);

                const fieldIndex = index + 1; // Use 1-based index for fields

                $(`#chordInputNum_${fieldIndex}`).val(reduced[0]);
                $(`#chordInputDen_${fieldIndex}`).val(reduced[1]);
            });

            performCalculationsAndStopPlayback();
        } else {
            // If the enumerated chord input is empty, clear the outputs
            $("#chord-size-input").val(1).trigger('change');
            $(`#chordInputNum_1`).val(baseNum);
            $(`#chordInputDen_1`).val(baseDen);
            performCalculationsAndStopPlayback();
        }
    }

    // Centralized calculation for the enumerated chord section
    $("#enumerated-chord-entry").on('input', 'input', calculateEnumeratedChord);

    // Event listeners for the new base ratio buttons
    $("#clear-enumerated-base").click(function() {
        $("#enumerated-base-num").val(1);
        $("#enumerated-base-den").val(1);
        calculateEnumeratedChord(); // Recalculate
    });

    $("#load-enumerated-base").click(function() {
        $("#enumerated-base-num").val(state.displayNumValue);
        $("#enumerated-base-den").val(state.displayDenValue);
        calculateEnumeratedChord(); // Recalculate
    });

    // Event listener for dynamically generated ratio input fields.
    // Only the active entry area drives the output: an edit inside an inactive
    // area updates its own field but leaves the current output untouched.
    $("#dynamic-ratio-fields-container, #chord-ratio-fields-container").on("change", "input.ratioIn", function() {
        const inChord = $(this).closest("#chord-ratio-fields-container").length > 0;
        const inInterval = $(this).closest("#dynamic-ratio-fields-container").length > 0;
        if (inChord && !$("#chordInput").prop("checked")) return;
        if (inInterval && !$("#intervalInput").prop("checked")) return;
        performCalculationsAndStopPlayback();
    });

    // Play button event listener
    $("#playOutputButton").on("click", function() {
        const wasPlaying = isPlaying;
        stopAllPlayback(0.2); // Fade out over 0.2 seconds; also stops the other windows
        if (!wasPlaying) {
            const chordSize = effectiveColumnCount();
            const frequencies = [];
            for (let i = 1; i <= chordSize; i++) {
                const freqValue = state.outputFrequencies[i]; // Get unrounded frequency directly from state
                if (freqValue !== undefined && !isNaN(freqValue)) {
                    frequencies.push(freqValue);
                }
            }
            if (frequencies.length > 0) {
                playFrequencies(frequencies, 0.2, slideDuration); // Pass slideDuration
                isPlaying = true;
                $(this).text("stop").addClass("playing-active");
            } else {
                console.warn("No frequencies to play.");
            }
        }
    });

    // EDO Play button event listener
    $("#playEdoOutputButton").on("click", function() {
        const wasPlaying = isPlayingEdo;
        stopAllPlayback(0.2); // Also stops the other windows
        if (!wasPlaying) {
            const chordSize = effectiveColumnCount();
            const frequencies = [];
            for (let i = 1; i <= chordSize; i++) {
                const freqValue = state.edoOutputFrequencies[i]; // EDO frequencies
                if (freqValue !== undefined && !isNaN(freqValue)) {
                    frequencies.push(freqValue);
                }
            }
            if (frequencies.length > 0) {
                playFrequencies(frequencies, 0.2, slideDuration); // Pass slideDuration
                isPlayingEdo = true;
                $(this).text("stop").addClass("playing-active");
            } else {
                console.warn("No EDO frequencies to play.");
            }
        }
    });

    // EDO Clear button event listener
    $("#clearEdoOutputButton").on("click", function() {
        clearAllIntervals();
    });

    // Sagittal Play button event listener
    $("#playSagittalOutputButton").on("click", function() {
        const wasPlaying = isPlayingSagittal;
        stopAllPlayback(0.2); // Also stops the other windows
        if (!wasPlaying) {
            const chordSize = effectiveColumnCount();
            const frequencies = [];
            for (let i = 1; i <= chordSize; i++) {
                const freqValue = state.sagittalOutputFrequencies[i];
                if (freqValue !== undefined && !isNaN(freqValue)) {
                    frequencies.push(freqValue);
                }
            }
            if (frequencies.length > 0) {
                playFrequencies(frequencies, 0.2, slideDuration); // Pass slideDuration
                isPlayingSagittal = true;
                $(this).text("stop").addClass("playing-active");
            } else {
                console.warn("No Sagittal frequencies to play.");
            }
        }
    });

    // Sagittal Clear button event listener
    $("#clearSagittalOutputButton").on("click", function() {
        clearAllIntervals();
    });

    // Johnston Play button event listener
    $("#playJohnstonOutputButton").on("click", function() {
        const wasPlaying = isPlayingJohnston;
        stopAllPlayback(0.2); // Also stops the other windows
        if (!wasPlaying) {
            const chordSize = effectiveColumnCount();
            const frequencies = [];
            for (let i = 1; i <= chordSize; i++) {
                const freqValue = state.johnstonOutputFrequencies[i];
                if (freqValue !== undefined && !isNaN(freqValue)) {
                    frequencies.push(freqValue);
                }
            }
            if (frequencies.length > 0) {
                playFrequencies(frequencies, 0.2, slideDuration); // Pass slideDuration
                isPlayingJohnston = true;
                $(this).text("stop").addClass("playing-active");
            } else {
                console.warn("No Johnston frequencies to play.");
            }
        }
    });

    // Johnston Clear button event listener
    $("#clearJohnstonOutputButton").on("click", function() {
        clearAllIntervals();
    });

    // Pre-fill the enumerated chord entry with an example chord on page load.
    // Clearing the field reverts to the placeholder ("e.g. 4:5:6, 4::8").
    $("#enumerated-chord-input").val("6:7:9");
    calculateEnumeratedChord();

    // Undo/redo (Cmd/Ctrl+Z, Cmd+Shift+Z or Ctrl+Y). Started last so the
    // fully initialised app - default chord included - is the first state in
    // history, and nothing set up above is recorded as a user edit.
    initHistory({ reapply: applyAllFromInputs });
});

// --- The glass Chrome forgot to hand over ---------------------------------
// Chrome on iOS, turned to landscape, keeps sizing the page as though its
// bottom toolbar were still there: the toolbar has gone, but the page is told
// a height a toolbar short of the screen, and stays short until a scroll or a
// reload. dvh cannot help — it is the browser's own figure, and the figure is
// the thing that is wrong. The visual viewport, though, is measured from what
// is actually on the glass, so when it is taller than #app the difference is
// screen going unused, and #app is set to it in pixels.
//
// Only ever taller. When the visible box is SMALLER than #app — the URL bar
// back up, the keyboard open over a field — the inline height is cleared and
// the stylesheet's dvh answers as before, so typing does not squash the tuner
// to fit above the keys. Re-run on the next frame and once more after the
// rotate animation, because the events that announce a new shape are
// delivered while the old one is still measured (the same three passes the
// masonry uses, for the same reason).
function fillForgottenGlass() {
    const app = document.getElementById('app');
    const vv = window.visualViewport;
    if (!app || !vv) return;
    app.style.height = '';
    const have = app.getBoundingClientRect().height;
    const glass = Math.max(vv.height, window.innerHeight || 0);
    if (glass - have > 2) app.style.height = Math.round(glass) + 'px';
}
let glassFrame = null;
function fillGlassSoon() {
    fillForgottenGlass();
    if (glassFrame !== null) cancelAnimationFrame(glassFrame);
    glassFrame = requestAnimationFrame(fillForgottenGlass);
    setTimeout(fillForgottenGlass, 320);
}
window.addEventListener('resize', fillGlassSoon);
window.addEventListener('orientationchange', fillGlassSoon);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fillGlassSoon);
fillGlassSoon();
