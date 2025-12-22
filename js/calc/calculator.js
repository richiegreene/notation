
import * as C from './constants.js';
import * as U from './utils.js';
import { state } from './state.js';
import * as UI from './ui.js';

// Basic chain of functions (defined below) 
export function doCalc() { 		
	getInputSum();
	getOandUArrays();
	getDisplaySum();
	getDisplayValues();
	prepareCentsCalculationData(); // New call
	calculateJiCents(); 
	UI.getPC(); 
	getCentDeviation();
	getOutputFrequency();
	getCurrentCents();
}

// retrieval of prime powers based on each comma
export function getInputSum(){
	state.hasPrimeGreaterThan89 = false; // Reset flag
	state.currentTotalNum = 1; // Reset total numerator
	state.currentTotalDen = 1; // Reset total denominator

	if ($("#paletteInput").prop("checked")){ 
		let sum = U.sumArray(C.autoOffsetToA, C.octave[UI.getOctave()]);
        sum = U.sumArray(sum, C.notes[UI.getNote()]);
        sum = U.sumArray(sum, C.chromatic[UI.getChromatic()]);
        sum = U.sumArray(sum, C.syntonic[UI.getSyntonic()]);
        sum = U.sumArray(sum, C.septimal[UI.getSeptimal()]);
        sum = U.sumArray(sum, C.undecimal[UI.getUndecimal()]);
        sum = U.sumArray(sum, C.tridecimal[UI.getTridecimal()]);
        sum = U.sumArray(sum, C.seventeen[UI.getSeventeen()]);
        sum = U.sumArray(sum, C.nineteen[UI.getNineteen()]);
        sum = U.sumArray(sum, C.twentyThree[UI.getTwentyThree()]);
        sum = U.sumArray(sum, C.twentyNine[UI.getTwentyNine()]);
        sum = U.sumArray(sum, C.thirtyOne[UI.getThirtyOne()]);
        sum = U.sumArray(sum, C.thirtySeven[UI.getThirtySeven()]);
        sum = U.sumArray(sum, C.fortyOne[UI.getFortyOne()]);
        sum = U.sumArray(sum, C.fortyThree[UI.getFortyThree()]);
        sum = U.sumArray(sum, C.fortySeven[UI.getFortySeven()]);
        sum = U.sumArray(sum, C.fiftyThree[UI.getFiftyThree()]);
        sum = U.sumArray(sum, C.fiftyNine[UI.getFiftyNine()]);
        sum = U.sumArray(sum, C.sixtyOne[UI.getSixtyOne()]);
        sum = U.sumArray(sum, C.sixtySevenths[UI.getSixtySeven()]);
        sum = U.sumArray(sum, C.seventyOne[UI.getSeventyOne()]);
        sum = U.sumArray(sum, C.seventyThree[UI.getSeventyThree()]);
        sum = U.sumArray(sum, C.seventyNine[UI.getSeventyNine()]);
        sum = U.sumArray(sum, C.eightyThree[UI.getEightyThree()]);
        state.inputSum = U.sumArray(sum, C.eightyNine[UI.getEightyNine()]);

} else if ($("#intervalInput").prop("checked")){ 
    // Start with a fresh inputSum for interval entry
    state.inputSum = C.reference; // Initialize to all zeros (1/1)

    let numStackingFields = $("#stacking-input").val();
    for (let i = 1; i <= numStackingFields; i++) {
        let currentInputNum = parseInt($(`#inputNum_${i}`).val()); // Parse as int
        let currentInputDen = parseInt($(`#inputDen_${i}`).val()); // Parse as int

        // Ensure values are not empty or invalid
        if (isNaN(currentInputNum) || currentInputNum <= 0) currentInputNum = 1;
        if (isNaN(currentInputDen) || currentInputDen <= 0) currentInputDen = 1;

        // Accumulate total input for display
        state.currentTotalNum *= currentInputNum;
        state.currentTotalDen *= currentInputDen;

        // Check for primes > 89
        if (currentInputNum > 1 && U.getValue(U.getArray(currentInputNum)) !== currentInputNum) { state.hasPrimeGreaterThan89 = true; }
        if (currentInputDen > 1 && U.getValue(U.getArray(currentInputDen)) !== currentInputDen) { state.hasPrimeGreaterThan89 = true; }

        let smallestTerms = U.reduce(currentInputNum, currentInputDen);
        let numArray = U.getArray(smallestTerms[0]);
        let denArray = U.getArray(smallestTerms[1]);
        let currentMonzo = U.diffArray(numArray, denArray);
        state.inputSum = U.sumArray(state.inputSum, currentMonzo);
    }
} else if ($("#chordInput").prop("checked")){
    // Logic for chord entry
    state.inputSum = C.reference; // Initialize to 1/1

    let numChordFields = $("#chord-size-input").val();
    for (let i = 1; i <= numChordFields; i++) {
        let currentInputNum = parseInt($(`#chordInputNum_${i}`).val());
        let currentInputDen = parseInt($(`#chordInputDen_${i}`).val());

        if (isNaN(currentInputNum) || currentInputNum <= 0) currentInputNum = 1;
        if (isNaN(currentInputDen) || currentInputDen <= 0) currentInputDen = 1;

        state.currentTotalNum *= currentInputNum;
        state.currentTotalDen *= currentInputDen;

        if (currentInputNum > 1 && U.getValue(U.getArray(currentInputNum)) !== currentInputNum) { state.hasPrimeGreaterThan89 = true; }
        if (currentInputDen > 1 && U.getValue(U.getArray(currentInputDen)) !== currentInputDen) { state.hasPrimeGreaterThan89 = true; }

        let smallestTerms = U.reduce(currentInputNum, currentInputDen);
        let numArray = U.getArray(smallestTerms[0]);
        let denArray = U.getArray(smallestTerms[1]);
        let currentMonzo = U.diffArray(numArray, denArray);
        state.inputSum = U.sumArray(state.inputSum, currentMonzo);
    }
}
}

// convert nums and dens into positive int only arrays
export function getOandUArrays(){
	var otonalArray = state.inputSum.map(value => {
		return value < 0 ? 0 : value;
	});
	var utonalArray = state.inputSum.map(value => {
		return value < 0 ? Math.abs(value) : 0;
	});

	if (state.hasPrimeGreaterThan89) {
		state.numValue = state.currentTotalNum;
		state.denValue = state.currentTotalDen;
	} else {
		state.numValue = U.getValue(otonalArray);
		state.denValue = U.getValue(utonalArray);
	}
	// reducedRatioRemainder calculation is now handled by hasPrimeGreaterThan89 flag
}

export function getFrequency1to1(){ //determine the default 1/1 frequency as an equal tempered interval from the KammerTon based on palette input
	state.freq1to1 = state.kammerTon 
		* Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
		* Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
		* Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12));
	$("#1to1Frequency").val(state.freq1to1.toFixed(4));
	getOutputFrequency();
	getCentDeviation();
}

export function getFrequencyKammerTon(){ //determine the KammerTon implied as an equal tempered relationship from 1/1 based on palette input
	state.kammerTon = state.freq1to1
		/ Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
		/ Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
		/ Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12));
	$("#frequencyA4").val(state.kammerTon.toFixed(4));
	getOutputFrequency();
	getCentDeviation();
}

// adjust monzo with respect to selected reference, calculate Tenney harmonic distance
export function getDisplaySum(){
	state.displaySum = state.inputSum;
	if ($("#paletteInput").prop("checked")){
		let sum = U.sumArray(state.inputSum, C.refOctave[UI.getRefOctave()]);
        sum = U.sumArray(sum, C.refNote[UI.getRefNote()]);
        state.displaySum = U.sumArray(sum, C.refAccidental[UI.getRefAccidental()]);
	}
	state.cat = state.displaySum;
	var hdValue = 0;
	if ($("#normalize").prop("checked")){
		hdValue = (Math.log2(3) * Math.abs(state.displaySum[1])) + (Math.log2(5) * Math.abs(state.displaySum[2])) + (Math.log2(7) * Math.abs(state.displaySum[3]))
		+ (Math.log2(11) * Math.abs(state.displaySum[4])) + (Math.log2(13) * Math.abs(state.displaySum[5])) + (Math.log2(17) * Math.abs(state.displaySum[6]))
		+ (Math.log2(19) * Math.abs(state.displaySum[7])) + (Math.log2(23) * Math.abs(state.displaySum[8])) + (Math.log2(29) * Math.abs(state.displaySum[9]))
		+ (Math.log2(31) * Math.abs(state.displaySum[10])) + (Math.log2(37) * Math.abs(state.displaySum[11])) + (Math.log2(41) * Math.abs(state.displaySum[12])) + (Math.log2(43) * Math.abs(state.displaySum[13])) + (Math.log2(47) * Math.abs(state.displaySum[14]));
	} else {
		hdValue = Math.abs(state.displaySum[0]) + (Math.log2(3) * Math.abs(state.displaySum[1])) + (Math.log2(5) * Math.abs(state.displaySum[2])) + (Math.log2(7) * Math.abs(state.displaySum[3]))
		+ (Math.log2(11) * Math.abs(state.displaySum[4])) + (Math.log2(13) * Math.abs(state.displaySum[5])) + (Math.log2(17) * Math.abs(state.displaySum[6]))
		+ (Math.log2(19) * Math.abs(state.displaySum[7])) + (Math.log2(23) * Math.abs(state.displaySum[8])) + (Math.log2(29) * Math.abs(state.displaySum[9]))
		+ (Math.log2(31) * Math.abs(state.displaySum[10])) + (Math.log2(37) * Math.abs(state.displaySum[11])) + (Math.log2(41) * Math.abs(state.displaySum[12])) + (Math.log2(43) * Math.abs(state.displaySum[13])) + (Math.log2(47) * Math.abs(state.displaySum[14]));
	}
	$("#hd").text(hdValue.toFixed(state.precision));
}

export function getDisplayValues(){ //calculate num and den for display
	state.displayNumValue = state.numValue; // Directly assign numValue
	state.displayDenValue = state.denValue; // Directly assign denValue
	
	//optionally normalizes output 
	if ($("#normalize").prop("checked")){
		var normTest = Math.log2(Math.abs(state.displayNumValue / state.displayDenValue));
		if (normTest < 0){
			normTest = 1 + Math.floor(Math.abs(normTest));
			normTest = Math.pow(2,normTest);
			state.displayNumValue = normTest * state.displayNumValue;
		} else if (normTest > 1) {
			normTest = Math.floor(normTest);
			normTest = Math.pow(2,normTest);
			state.displayDenValue = normTest * state.displayDenValue;
		}
		var reduceNormalized = U.reduce(state.displayNumValue,state.displayDenValue);
		state.displayNumValue = reduceNormalized[0];
		state.displayDenValue = reduceNormalized[1];
	}

    let numColumns = $("#chord-size-input").val();
    for (let i = 1; i <= numColumns; i++) {
        if (state.displayNumValue <= 9007199254740991 && state.displayDenValue <= 9007199254740991){
            $("#num_" + i).text(state.displayNumValue);
            $("#den_" + i).text(state.displayDenValue);
            $("#ratioCopyHelper_" + i).text(state.displayNumValue + '/' + state.displayDenValue);
        } else {
            var float = state.displayNumValue / state.displayDenValue;
            $("#num_" + i).text(float);
            $("#den_" + i).text(1);
            $("#ratioCopyHelper_" + i).text(float + '/' + 1);
        }
    }

	if (state.displayNumValue <= 9007199254740991 && state.displayDenValue <= 9007199254740991){
		var displayNumArray = U.getArray(state.displayNumValue);
		var displayDenArray = U.getArray(state.displayDenValue);
		var displayMeldoicSum = U.diffArray(displayNumArray, displayDenArray);
		$("#monzo").text(displayMeldoicSum);
		// Removed reducedRatioRemainder logic here as hasPrimeGreaterThan89 handles it
		state.monzoMessage = ""; // Clear monzoMessage if not used
		$("#over31Message").text(state.monzoMessage);
	} else {
		$("#monzo").text("stack overflow");
		$("#over31Message").text("");
	}
}

export function prepareCentsCalculationData() {
    if ($("#paletteInput").prop("checked")){ 
        let sum = U.sumArray(state.inputSum, C.refOctave[UI.getRefOctave()]);
        sum = U.sumArray(sum, C.refNote[UI.getRefNote()]);
        state.centsSum = U.sumArray(sum, C.refAccidental[UI.getRefAccidental()]);
    } else if ($("#intervalInput").prop("checked")){ 
        state.centsSum = state.inputSum;
    } else if ($("#chordInput").prop("checked")){
        state.centsSum = state.inputSum;
    }
    var centsOtonalArray = state.centsSum.map(value => {
        return value < 0 ? 0 : value;
    });
    var centsUtonalArray = state.centsSum.map(value => {
        return value < 0 ? Math.abs(value) : 0;
    });
    state.centsNumValue = U.getValue(centsOtonalArray);
    state.centsDenValue = U.getValue(centsUtonalArray);
}

export function calculateJiCents(){
	if ($("#intervalInput").prop("checked")){
            state.jiCents = 1200*Math.log2((state.displayNumValue) / (state.displayDenValue) 
            / (state.kammerTon 
            / (state.freq1to1
            / Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
            / Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
            / Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12))))); 
    } else {
        state.jiCents = 1200*Math.log2((state.centsNumValue) / (state.centsDenValue)
            / (state.kammerTon 
            / (state.freq1to1
            / Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
            / Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
            / Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12))))); 
    }
}

export function getCentDeviation(){ //calculate cent deviation, interval to ref (corrected if tuning metre setting is unlinked)
	// centsSum, centsNumValue, centsDenValue are now global and prepared by prepareCentsCalculationData()
	// jiCents calculation moved to calculateJiCents()
	// harmonic series as number of 12-ED2 semitones
	var et2 = (state.centsSum[0] * 12);
	var et3 = (state.centsSum[1] * 19);
	var et5 = (state.centsSum[2] * 28);
	var et7 = (state.centsSum[3] * 34);
	var et11 = (state.centsSum[4] * 41);
	var et13 = (state.centsSum[5] * 45);
	var et17 = (state.centsSum[6] * 49);
	var et19 = (state.centsSum[7] * 51);
	var et23 = (state.centsSum[8] * 54);
	var et29 = (state.centsSum[9] * 58);
	var et31 = (state.centsSum[10] * 60);
	var et37 = (state.centsSum[11] * 62);
	var et41 = (state.centsSum[12] * 64);
	var et43 = (state.centsSum[13] * 65);
	var et47 = (state.centsSum[14] * 67);
	var etSemiTones = (et2 + et3 + et5 + et7 + et11 + et13 + et17 + et19 + et23 + et29 + et31 + et37 + et41 + et43 + et47);
	var etCents = etSemiTones * 100.0;
	state.centDeviation = U.mod((state.jiCents - etCents),100);
	if (state.centDeviation > 50){
		state.centDeviation = -(100.0 - state.centDeviation);
	}

    let numColumns = $("#chord-size-input").val();
    for (let i = 1; i <= numColumns; i++) {
        let centsText;
        if (Math.round(state.centDeviation * 1e9) / 1e9 === 0) {
            centsText = "";
        } else if (state.centDeviation > 0) {
            centsText = "+" + state.centDeviation.toFixed(state.precision);
        } else {
            centsText = state.centDeviation.toFixed(state.precision);
        }
        // Update individual spans
        $("#midiNote_" + i).text(state.parsedMidiNoteGlobal.letter);
        if (state.parsedMidiNoteGlobal.accidental === "j") {
            $("#midiAccidental_" + i).text(""); // Hide "j" accidental
        } else {
            $("#midiAccidental_" + i).text(state.parsedMidiNoteGlobal.accidental);
        }
        $("#cents_" + i).text(centsText);
    }
	UI.getBend();
	if ($("#intervalInput").prop("checked")){
			state.cents_toRef = 1200*Math.log2((state.displayNumValue) / (state.displayDenValue));
	} else {
		state.cents_toRef = 1200*Math.log2((state.centsNumValue) / (state.centsDenValue));
	}
	if ($("#normalize").prop("checked")){
		state.cents_toRef = U.mod(state.cents_toRef,1200);
	}

    for (let i = 1; i <= numColumns; i++) {
        if (state.cents_toRef > 0) {
            $("#JIgross_" + i).text("+"+state.cents_toRef.toFixed(state.precision) + "c");
        } else{
            $("#JIgross_" + i).text(state.cents_toRef.toFixed(state.precision) + "c");
        }
    }
	//getEDOSteps();
}

export function getOutputFrequency(){
	var outputFreq = state.freq1to1 * (state.displayNumValue / state.displayDenValue);
    let numColumns = $("#chord-size-input").val();
    for (let i = 1; i <= numColumns; i++) {
	    $("#frequency_" + i).text(outputFreq.toFixed(state.precision)+"Hz");
    }
}

export function getCurrentCents(){ //load the current pitch (normalised/octave reduced) into the enharmonic search cent input box
	state.currentCents = state.cents_toRef % 1200;
	while (state.currentCents < 0){
		state.currentCents = state.currentCents + 1200.0;
	}
	$("#centreCents").val(state.currentCents.toFixed(state.precision));
}

export function getSavedInputSum(){
	const savedSmallestTerms = U.reduce(state.savedNum,state.savedDen);
	state.reducedSavedNum = savedSmallestTerms[0];
	state.reducedSavedDen = savedSmallestTerms[1];
	state.savedNumArray = U.getArray(state.reducedSavedNum);
	state.savedDenArray = U.getArray(state.reducedSavedDen);
	state.savedInputSum = U.diffArray(state.savedNumArray, state.savedDenArray);
	doCalc(); 
}
