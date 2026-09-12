/* =====================================================================
 *  IN-BROWSER PLAYBACK
 * =====================================================================
 *
 * The two ways a chord leaves this app as sound — the browser's own synth and
 * MPE MIDI — behind one call. Everything above this file asks for a list of
 * frequencies and gets them sounding; which of the two routes carries them is
 * the Play drawer's business, not the caller's.
 *
 * The browser route is Models' and Keyboard Designer's voice engine (see
 * ./synth/), not a bank of OscillatorNodes. Three things follow from that, and
 * all three are the reason for the change:
 *
 *   The wavetables are band-limited per octave, so a partial that would fall
 *   above Nyquist is not synthesised at all rather than folded back down as an
 *   inharmonic tone somewhere inside the interval being compared. In an app
 *   whose whole subject is exact pitch, an aliased partial is a wrong answer.
 *
 *   There is a second family — the filtered wavetable — whose brightness
 *   follows its own amplitude, so the attack of a note opens up and its tail
 *   closes down. That is a property of the recursion, not an effect bolted on
 *   after, which is why the envelope lives inside the oscillator.
 *
 *   The envelope is an ADSR the user can draw, replacing the fixed 0.1s fade
 *   in and out. `fadeDuration` therefore no longer describes the sound — the
 *   release does — but it is still accepted and still honoured by the MPE
 *   route, so no caller had to change.
 *
 * One voice id per column, so a chord re-struck while it is already sounding
 * takes its own voices back rather than stacking a second copy on top.
 * ------------------------------------------------------------------ */

import {
    sendMpeNoteOn, sendMpeNoteOff, sendMpePitchBendUpdate,
    releaseAllMpeNotes, playbackMode, isMpeNoteActive,
} from './mpe-playback.js';
import * as Voice from './synth/voice.js';
import { FILTERED_MIN } from './synth/timbre.js';

/** What the Play drawer opens on: a filtered saw, the engine's own default. */
export const DEFAULT_TIMBRE = FILTERED_MIN + 200;
export const DEFAULT_ADSR = { a: 0.016, d: 0.120, s: 0.66, r: 0.544 };

/** Ids of the browser voices currently sounding, so they can be released. */
let sounding = [];

/* HOW LONG A NOTE IS HELD.
 *
 * Zero is a held key: the chord sounds until something stops it, which is how
 * every play button always worked. A positive number of seconds is a key
 * pressed and let go — the release begins on its own when the time is up,
 * and whoever pressed the key is told so through `notation:playback-ended`
 * on the document, so a play button can go back to saying "play" and a
 * tuner mark can lose its underline without either having to poll. Set from
 * the Play drawer; kept here because this is the one place every route to
 * sound already passes through. */
let holdSeconds = 0;
let holdTimer = null;

/** Seconds a chord sounds before releasing itself; 0 (or less) holds it. */
export function setPlayDuration(seconds) {
    holdSeconds = seconds > 0 ? seconds : 0;
}

function armHoldTimer() {
    clearTimeout(holdTimer);
    holdTimer = null;
    if (!holdSeconds) return;
    holdTimer = setTimeout(() => {
        holdTimer = null;
        stopAllFrequencies(0.1);
        document.dispatchEvent(new CustomEvent('notation:playback-ended'));
    }, holdSeconds * 1000);
}

/**
 * Build the audio graph before anybody plays it.
 *
 * Named as it always was — every caller says `initAudio()` — but it no longer
 * creates a context and stops there: see warm() in ./synth/voice.js for why
 * the graph has to be standing before the first gesture rather than built by
 * it. Nothing sounds until a note is asked for.
 */
export function initAudio() {
    Voice.warm();
}

/** The wave every browser voice is synthesised from. */
export function setTimbre(value) {
    Voice.setTimbre(value);
}

/** The shape of a note: attack, decay, sustain level, release. */
export function setAdsr(envelope) {
    Voice.setAdsr(envelope);
}

/**
 * Sound a chord.
 *
 * @param {number[]} frequencies one per output column, in Hz
 * @param {number} fadeDuration kept for the MPE route and for callers; the
 *        browser route's shape is the drawn envelope instead
 * @param {number} slideDuration MPE pitch-bend glide, in seconds
 */
export function playFrequencies(frequencies, fadeDuration = 0.1, slideDuration = 0.1) {
    armHoldTimer(); // a re-press starts the clock again
    if (playbackMode === 'browser' || playbackMode === 'both' || playbackMode === undefined) {
        // Anything left over from the previous chord goes into its release
        // before the new one is struck, so a re-press is not two chords deep.
        releaseBrowserVoices();

        frequencies.forEach((freq, index) => {
            if (!(freq > 20) || freq >= 20000) {
                console.warn(`Frequency ${freq}Hz is out of audible range or unsafe, skipping.`);
                return;
            }
            const id = `col-${index}`;
            Voice.noteOn(id, freq);
            sounding.push(id);
        });
    } else if (sounding.length) {
        releaseBrowserVoices();
    }

    if (playbackMode === 'mpe-midi' || playbackMode === 'both') {
        const currentChordIndices = new Set(frequencies.map((_, index) => index));

        // Any channel that was sounding a note this chord no longer has.
        for (let i = 0; i < 16; i++) {
            if (isMpeNoteActive(i) && !currentChordIndices.has(i)) {
                sendMpeNoteOff(i);
            }
        }

        frequencies.forEach((freq, index) => {
            if (isMpeNoteActive(index)) {
                sendMpePitchBendUpdate(index, freq, false, slideDuration);
            } else {
                sendMpeNoteOn(index, freq, 100, false, slideDuration);
            }
        });
    } else {
        releaseAllMpeNotes();
    }
}

/**
 * Stop everything sounding.
 *
 * `fadeDuration` no longer sets how long the browser voices take to go — the
 * envelope's release does — but it is still the signature every caller uses,
 * and it still decides the MPE side. Kept rather than removed so a call site
 * that means "stop quickly" is not silently reinterpreted.
 */
export function stopAllFrequencies(fadeDuration = 0.1) {
    clearTimeout(holdTimer);
    holdTimer = null;
    releaseBrowserVoices();
    if (playbackMode === 'mpe-midi' || playbackMode === 'both') {
        releaseAllMpeNotes();
    }
}

function releaseBrowserVoices() {
    if (!sounding.length) return;
    for (const id of sounding) Voice.noteOff(id);
    sounding = [];
}
