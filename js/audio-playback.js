let audioCtx;
let currentPeriodicWave = null;
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
        // Main gain node for overall volume control (optional, but good practice)
        // let mainGainNode = audioCtx.createGain();
        // mainGainNode.connect(audioCtx.destination);
        
        compensationGainNode = audioCtx.createGain();
        compensationGainNode.connect(audioCtx.destination); // Connect directly to destination for now
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

// Functions to be used for actual playback later
let voices = []; // Array of { osc: OscillatorNode, gain: GainNode }

export function playFrequencies(frequencies, fadeDuration = 0.1) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    // Stop any currently playing notes immediately
    stopAllFrequencies(0); 

    // Create new voices for the current frequencies
    frequencies.forEach(freq => {
        // Simple range check for frequencies to avoid extreme values
        if (freq <= 20 || freq >= 20000) { // Humans typically hear 20Hz to 20kHz
            console.warn(`Frequency ${freq}Hz is out of audible range or unsafe, skipping.`);
            return;
        }

        const osc = audioCtx.createOscillator();
        if (currentPeriodicWave) {
            osc.setPeriodicWave(currentPeriodicWave);
        } else {
            osc.type = 'sine'; // Fallback to sine if no periodic wave is set
        }
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // Start at 0 gain
        gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + fadeDuration); // Fade in

        osc.connect(gainNode);
        gainNode.connect(compensationGainNode); // Connect to the overall compensation gain node
        osc.start(audioCtx.currentTime);

        voices.push({ osc, gain: gainNode });
    });
}

export function stopAllFrequencies(fadeDuration = 0.1) {
    if (!audioCtx) return;

    voices.forEach(voice => {
        voice.gain.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, audioCtx.currentTime);
        voice.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + fadeDuration); // Fade out
        voice.osc.stop(audioCtx.currentTime + fadeDuration); // Stop after fade
        voice.osc.disconnect();
        voice.gain.disconnect();
    });
    voices = []; // Clear the array of active voices
}
