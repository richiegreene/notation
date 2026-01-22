import { initMidiOutput, sendMpeNoteOn, sendMpeNoteOff, sendMpePitchBendUpdate, releaseAllMpeNotes, playbackMode, isMpeNoteActive } from './mpe-playback.js';

let audioCtx;
export let currentPeriodicWave = null; // Export to be accessible for other modules if needed
let compensationGainNode;

const numHarmonics = 64;
const sineCoeffs = new Float32Array(numHarmonics);
const triangleCoeffs = new Float32Array(numHarmonics);
const sawtoothCoeffs = new Float32Array(numHarmonics);
const squareCoeffs = new Float32Array(numHarmonics);

sineCoeffs[1] = 1;

for (let i = 1; i < numHarmonics; i++) {
    const n = i;
    // Sawtooth: 1/n
    sawtoothCoeffs[n] = 1 / n;
    if (n % 2 !== 0) {
        // Square: 1/n for odd harmonics
        squareCoeffs[n] = 1 / n;
        // Triangle: 1/n^2 for odd harmonics, with alternating sign
        triangleCoeffs[n] = (1 / (n * n)) * ((n - 1) % 4 === 0 ? 1 : -1);
    }
}

const waveCoeffs = [sineCoeffs, triangleCoeffs, sawtoothCoeffs, squareCoeffs];
const realCoeffs = new Float32Array(numHarmonics).fill(0); // All our waves are sine-based

// Gain compensation values to normalize perceived loudness.
// Sine, Triangle, Sawtooth, Square
const loudnessCompensation = [1.0, 1.0, 0.6, 0.75]; 

export function initAudio() {
    if (audioCtx) return; // Already initialized
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        compensationGainNode = audioCtx.createGain();
        compensationGainNode.connect(audioCtx.destination);
    } catch (e) {
        console.error(`Error creating audio context: ${e.message}`);
    }
}

export function updateWaveform(sliderValue) {
    if (!audioCtx) initAudio();

    // Handle the edge case for a pure square wave at the slider's maximum
    if (sliderValue >= 3) {
        const pureSquareCoeffs = waveCoeffs[3];
        if (compensationGainNode) {
            compensationGainNode.gain.setTargetAtTime(loudnessCompensation[3], audioCtx.currentTime, 0.01);
        }
        currentPeriodicWave = audioCtx.createPeriodicWave(realCoeffs, pureSquareCoeffs, { disableNormalization: false });
        drawWaveform(pureSquareCoeffs);
        return;
    }

    const floor = Math.floor(sliderValue);
    const ceil = Math.ceil(sliderValue);
    const mix = sliderValue - floor;

    const fromCoeffs = waveCoeffs[floor];
    const toCoeffs = waveCoeffs[ceil];

    const interpolatedImag = new Float32Array(numHarmonics);
    for (let i = 1; i < numHarmonics; i++) {
        const from = fromCoeffs[i] || 0;
        const to = toCoeffs[i] || 0;
        interpolatedImag[i] = from + (to - from) * mix;
    }

    // Interpolate gain compensation
    const fromGain = loudnessCompensation[floor];
    const toGain = loudnessCompensation[ceil];
    const interpolatedGain = fromGain + (toGain - fromGain) * mix;

    if (compensationGainNode) {
        compensationGainNode.gain.setTargetAtTime(interpolatedGain, audioCtx.currentTime, 0.01);
    }

    currentPeriodicWave = audioCtx.createPeriodicWave(realCoeffs, interpolatedImag, { disableNormalization: false });
    
    drawWaveform(interpolatedImag);
}

export function drawWaveform(imag) {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const yCenter = height / 2;
    const amplitude = height * 0.4;

    let maxVal = 0;
    const wave = new Float32Array(width);
    for (let i = 0; i < width; i++) {
        const time = i / width;
        let y = 0;
        for (let n = 1; n < imag.length; n++) {
            y += imag[n] * Math.sin(2 * Math.PI * n * time);
        }
        wave[i] = y;
        if (Math.abs(y) > maxVal) {
            maxVal = Math.abs(y);
        }
    }

    // Normalize and draw
    ctx.moveTo(0, yCenter);
    for (let i = 0; i < width; i++) {
        const normalizedY = (wave[i] / maxVal) * amplitude;
        ctx.lineTo(i, yCenter - normalizedY);
    }
    ctx.stroke();
}

let voices = [];

export function playFrequencies(frequencies, fadeDuration = 0.1, slideDuration = 0.1) {
    // --- Handle Browser Audio Playback ---
    if (playbackMode === 'browser' || playbackMode === undefined) { // playbackMode undefined for initial load
        if (!audioCtx) initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        stopAllFrequencies(0); // Stop any currently playing browser notes immediately

        frequencies.forEach(freq => {
            if (freq <= 20 || freq >= 20000) {
                console.warn(`Frequency ${freq}Hz is out of audible range or unsafe, skipping.`);
                return;
            }

            const osc = audioCtx.createOscillator();
            if (currentPeriodicWave) {
                osc.setPeriodicWave(currentPeriodicWave);
            } else {
                osc.type = 'sine';
            }
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + fadeDuration);

            osc.connect(gainNode);
            gainNode.connect(compensationGainNode);
            osc.start(audioCtx.currentTime);

            voices.push({ osc, gain: gainNode });
        });
    } else {
        // If not in browser mode, stop any existing browser audio
        if (voices.length > 0) {
            stopAllFrequencies(0); // Immediately stop browser audio
        }
    }

    // --- Handle MPE MIDI Playback ---
    if (playbackMode === 'mpe-midi' || playbackMode === 'both') {
        // Assume frequencies array maps to MPE note indices 0, 1, 2, ...
        // For simplicity, we'll assign MPE channels based on array index.
        // This means a new channel will be requested for each note in the chord.

        const currentChordIndices = new Set(frequencies.map((_, index) => index));
        
        // Find notes that were active but are no longer in the current chord
        // Assuming max 4 voices based on Tetrads, adjust if needed for Notation
        for (let i = 0; i < 4; i++) { // Iterate through potential previous notes
            if (isMpeNoteActive(i) && !currentChordIndices.has(i)) {
                sendMpeNoteOff(i);
            }
        }

        frequencies.forEach((freq, index) => {
            if (isMpeNoteActive(index)) {
                sendMpePitchBendUpdate(index, freq, false, slideDuration); // Changed to false
            } else {
                sendMpeNoteOn(index, freq, 100, false, slideDuration); // Changed to false
            }
        });
    } else {
        releaseAllMpeNotes(); // Ensure MIDI notes are off if switching away from MIDI mode
    }
}

export function stopAllFrequencies(fadeDuration = 0.1) {
    // --- Stop Browser Audio ---
    if (playbackMode === 'browser' || playbackMode === undefined) {
        const stopDelay = fadeDuration * 1000 + 50; // A bit longer than fade to ensure sound stops

        voices.forEach(voice => {
            voice.gain.gain.cancelScheduledValues(audioCtx.currentTime);
            voice.gain.gain.setValueAtTime(voice.gain.gain.value, audioCtx.currentTime);
            voice.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration);
        });

        const oldVoices = voices;
        voices = [];
        setTimeout(() => {
            oldVoices.forEach(voice => {
                try {
                    voice.osc.stop();
                    voice.osc.disconnect();
                    voice.gain.disconnect();
                } catch (e) {
                    console.warn("Error stopping audio voice:", e);
                }
            });
        }, stopDelay);
    } else {
        voices.forEach(voice => {
            try {
                voice.osc.stop();
                voice.osc.disconnect();
                voice.gain.disconnect();
            } catch (e) {
                console.warn("Error stopping audio voice:", e);
            }
        });
        voices = [];
    }

    // --- Stop MPE MIDI ---
    if (playbackMode === 'mpe-midi' || playbackMode === 'both') {
        releaseAllMpeNotes();
    }
}
