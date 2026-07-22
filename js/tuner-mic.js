// js/tuner-mic.js
//
// Microphone pitch detection for the Tuner window. The mic is only requested
// when start() is called (i.e. when the user presses the Tuner's on/off
// toggle) — nothing here runs, and no permission prompt appears, until then.
// stop() fully releases the mic (stops the track and closes the context).
//
// Pitch is estimated with normalized autocorrelation (an ACF/MPM-style peak
// pick), which is robust for sustained musical tones from voice or instrument.

let audioCtx = null;
let analyser = null;
let mediaStream = null;
let sourceNode = null;
let rafId = null;
let buffer = null;
let running = false;
let onPitch = null; // callback(frequency|null, clarity)

const FFT_SIZE = 2048;           // ~46ms window at 44.1kHz
const MIN_FREQ = 50;             // Hz — lowest pitch we bother tracking
const MAX_FREQ = 1600;           // Hz — highest pitch we bother tracking
const CLARITY_THRESHOLD = 0.90;  // normalized ACF peak height to accept
const RMS_GATE = 0.008;          // ignore near-silence

/**
 * Start listening. Requests mic permission on first call.
 * @param {(frequency:number|null, clarity:number) => void} callback
 * @returns {Promise<void>} resolves once listening; rejects if mic denied.
 */
export async function start(callback) {
    if (running) return;
    onPitch = callback;

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        },
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    sourceNode.connect(analyser);

    buffer = new Float32Array(analyser.fftSize);
    running = true;
    tick();
}

/** Stop listening and release the microphone completely. */
export function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (sourceNode) { try { sourceNode.disconnect(); } catch (e) {} sourceNode = null; }
    analyser = null;
    if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
    }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    buffer = null;
    onPitch = null;
}

export function isRunning() {
    return running;
}

function tick() {
    if (!running || !analyser) return;
    analyser.getFloatTimeDomainData(buffer);
    const { frequency, clarity } = detectPitch(buffer, audioCtx.sampleRate);
    if (onPitch) onPitch(frequency, clarity);
    rafId = requestAnimationFrame(tick);
}

/**
 * Normalized autocorrelation pitch detector.
 * @returns {{frequency:number|null, clarity:number}}
 */
function detectPitch(buf, sampleRate) {
    const n = buf.length;

    // RMS gate: silence -> no pitch.
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < RMS_GATE) return { frequency: null, clarity: 0 };

    const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), n - 1);
    const minLag = Math.max(Math.floor(sampleRate / MAX_FREQ), 2);

    // Autocorrelation, normalized so the zero-lag energy is 1.
    let bestLag = -1;
    let bestVal = 0;
    let prev = 0;      // correlation at lag-1, to detect a rising->falling peak
    let rising = false;

    // Energy normalizer (zero-lag autocorrelation).
    let energy = 0;
    for (let i = 0; i < n; i++) energy += buf[i] * buf[i];
    if (energy === 0) return { frequency: null, clarity: 0 };

    for (let lag = minLag; lag <= maxLag; lag++) {
        let sum = 0;
        for (let i = 0; i < n - lag; i++) sum += buf[i] * buf[i + lag];
        const norm = sum / energy;

        // Track the first strong local maximum (avoids octave errors from
        // picking the global max at very short lags).
        if (norm > prev) {
            rising = true;
        } else if (rising && norm < prev && prev > CLARITY_THRESHOLD) {
            bestLag = lag - 1;
            bestVal = prev;
            break;
        }
        if (norm > bestVal) { bestVal = norm; bestLag = lag; }
        prev = norm;
    }

    if (bestLag <= 0 || bestVal < CLARITY_THRESHOLD) {
        return { frequency: null, clarity: bestVal };
    }

    // Parabolic interpolation around bestLag for sub-sample accuracy.
    const lag = parabolicPeak(buf, bestLag, n, energy);
    const frequency = sampleRate / lag;
    if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
        return { frequency: null, clarity: bestVal };
    }
    return { frequency, clarity: bestVal };
}

/** Refine an autocorrelation peak with a 3-point parabola. */
function parabolicPeak(buf, lag, n, energy) {
    const acf = (l) => {
        let sum = 0;
        for (let i = 0; i < n - l; i++) sum += buf[i] * buf[i + l];
        return sum / energy;
    };
    const y0 = acf(lag - 1);
    const y1 = acf(lag);
    const y2 = acf(lag + 1);
    const denom = (y0 - 2 * y1 + y2);
    if (denom === 0) return lag;
    const shift = 0.5 * (y0 - y2) / denom;
    return lag + shift;
}
