// js/tuner-mic.js
//
// Microphone pitch detection for the Tuner window. The mic is only requested
// when start() is called (i.e. when the user presses the Tuner's on/off
// toggle) — nothing here runs, and no permission prompt appears, until then.
// stop() fully releases the mic (stops the track and closes the context).
//
// Pitch is estimated with the McLeod Pitch Method (MPM): the Normalized Square
// Difference Function (NSDF) is normalized by the *local* signal energy, so it
// peaks near 1.0 at the true period even for rich, harmonic instrument/voice
// tones (not just pure sine whistles) and holds up well in the low register.

let audioCtx = null;
let analyser = null;
let mediaStream = null;
let sourceNode = null;
let rafId = null;
let buffer = null;
let nsdf = null;        // reused NSDF scratch buffer
let running = false;
let onPitch = null;     // callback(frequency|null, clarity)

// A larger window resolves low frequencies (more periods per frame); detection
// is throttled below rAF so the extra cost stays cheap on phones.
const FFT_SIZE = 4096;             // ~85–93ms window (44.1–48kHz)
const MIN_FREQ = 45;               // Hz — lowest pitch we track (~F#1)
const MAX_FREQ = 1600;             // Hz — highest pitch we track (~G6)
const K_CLARITY = 0.85;            // accept the first peak >= K * strongest peak
const MIN_CLARITY = 0.45;          // absolute NSDF floor to accept (rejects noise)
const RMS_GATE = 0.004;            // ignore near-silence (low, for weak mics)
const DETECT_INTERVAL_MS = 25;     // ~40 detections/sec (rendering still runs at rAF)

let lastDetectAt = 0;
let lastFreq = null;
let lastClarity = 0;

/**
 * Start listening. Requests mic permission on first call.
 * @param {(frequency:number|null, clarity:number) => void} callback
 * @returns {Promise<void>} resolves once listening; rejects if mic denied.
 */
export async function start(callback) {
    if (running) return;
    onPitch = callback;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia unavailable (needs https / a supported browser)');
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false, // keep the raw tone (these processors distort
            noiseSuppression: false, // sustained pitches and their harmonics)
            autoGainControl: true,   // but do boost a weak mic signal
        },
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    sourceNode.connect(analyser);

    buffer = new Float32Array(analyser.fftSize);
    nsdf = new Float32Array(Math.ceil(audioCtx.sampleRate / MIN_FREQ) + 4);
    lastDetectAt = 0;
    lastFreq = null;
    lastClarity = 0;
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
    nsdf = null;
    onPitch = null;
}

export function isRunning() {
    return running;
}

function tick() {
    if (!running || !analyser) return;
    rafId = requestAnimationFrame(tick);

    // Detection is the expensive part, so run it a few times less often than the
    // display; the strobe keeps scrolling smoothly from the last detected pitch.
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - lastDetectAt >= DETECT_INTERVAL_MS) {
        lastDetectAt = now;
        analyser.getFloatTimeDomainData(buffer);
        const result = detectPitch(buffer, audioCtx.sampleRate);
        lastFreq = result.frequency;
        lastClarity = result.clarity;
    }
    if (onPitch) onPitch(lastFreq, lastClarity);
}

/**
 * McLeod Pitch Method.
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

    // NSDF(tau) = 2 * Σ x[i]x[i+tau] / Σ (x[i]^2 + x[i+tau]^2), in [-1, 1].
    // Computed from a short lag up so the initial descent (from the lag-0 peak)
    // is captured and can be skipped before we hunt for the fundamental.
    const searchMin = 2;
    for (let tau = searchMin; tau <= maxLag; tau++) {
        let acf = 0;
        let energy = 0;
        const lim = n - tau;
        for (let i = 0; i < lim; i++) {
            const a = buf[i];
            const b = buf[i + tau];
            acf += a * b;
            energy += a * a + b * b;
        }
        nsdf[tau] = energy > 0 ? (2 * acf) / energy : 0;
    }

    // Skip the initial positive region (the descent from the lag-0 correlation).
    let tau = searchMin;
    while (tau <= maxLag && nsdf[tau] > 0) tau++;

    // Key maxima: the highest NSDF within each subsequent positive region.
    let globalMax = 0;
    const peaks = []; // [lag, value]
    while (tau <= maxLag) {
        while (tau <= maxLag && nsdf[tau] <= 0) tau++;
        let localMax = -Infinity;
        let localLag = -1;
        while (tau <= maxLag && nsdf[tau] > 0) {
            if (nsdf[tau] > localMax) { localMax = nsdf[tau]; localLag = tau; }
            tau++;
        }
        if (localLag >= 0) {
            peaks.push(localLag, localMax);
            if (localMax > globalMax) globalMax = localMax;
        }
    }

    if (!peaks.length || globalMax < MIN_CLARITY) {
        return { frequency: null, clarity: globalMax };
    }

    // The fundamental is the first key maximum at/above K * the strongest peak
    // (choosing the earliest such peak avoids octave-down errors).
    const threshold = K_CLARITY * globalMax;
    let chosenLag = peaks[0];
    let chosenVal = peaks[1];
    for (let i = 0; i < peaks.length; i += 2) {
        if (peaks[i + 1] >= threshold) { chosenLag = peaks[i]; chosenVal = peaks[i + 1]; break; }
    }

    const lag = parabolicLag(chosenLag, minLag, maxLag);
    const frequency = sampleRate / lag;
    if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
        return { frequency: null, clarity: chosenVal };
    }
    return { frequency, clarity: chosenVal };
}

/** Refine a peak lag with 3-point parabolic interpolation over the NSDF. */
function parabolicLag(lag, minLag, maxLag) {
    if (lag <= minLag || lag >= maxLag) return lag;
    const y0 = nsdf[lag - 1];
    const y1 = nsdf[lag];
    const y2 = nsdf[lag + 1];
    const denom = y0 - 2 * y1 + y2;
    if (denom === 0) return lag;
    return lag + 0.5 * (y0 - y2) / denom;
}
