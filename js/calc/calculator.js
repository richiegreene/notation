import * as C from './constants.js';
import * as U from './utils.js';
import { state } from './state.js';
import * as UI from './ui.js';

/**
 * Main calculation controller.
 * Determines the input mode and triggers the appropriate calculation pipeline.
 */
export function doCalc() {
    const chordSize = $("#chord-size-input").val();
    const isChordMode = $("#chordInput").prop("checked");

    if (isChordMode) {
        // In Chord Mode, calculate each column independently
        for (let i = 1; i <= chordSize; i++) {
            const inputSumForColumn = getInputSumForColumn(i);
            performCalculationsForColumn(i, inputSumForColumn);
        }
    } else {
        // In HEJI or Interval Mode, perform one calculation and display in all columns
        const combinedInputSum = getCombinedInputSum();
        for (let i = 1; i <= chordSize; i++) {
            performCalculationsForColumn(i, combinedInputSum);
        }
    }
}

/**
 * Runs the full calculation and display pipeline for a given column index and input monzo.
 * @param {number} columnIndex - The index of the output column to update.
 * @param {number[]} inputSum - The input monzo to calculate.
 */
function performCalculationsForColumn(columnIndex, inputSum) {
    // Set the global state for this column's calculation
    state.inputSum = inputSum;

    // Run the calculation pipeline
    getOandUArrays();
    getDisplaySum();
    
    // Run the display functions for this specific column
    getDisplayValues(columnIndex);
    prepareCentsCalculationData();
    calculateJiCents();
    UI.getPC(columnIndex); 
    getCentDeviation(columnIndex);
    getOutputFrequency(columnIndex);
    
    // Only update the enharmonic search box for the first column to avoid confusion
    if (columnIndex === 1) {
        getCurrentCents();
    }
}

/**
 * Calculates the input monzo for a single ratio input in Chord Mode.
 * @param {number} columnIndex - The index of the chord input to read.
 * @returns {number[]} The calculated monzo for the column.
 */
function getInputSumForColumn(columnIndex) {
    let currentInputNum = parseInt($(`#chordInputNum_${columnIndex}`).val());
    let currentInputDen = parseInt($(`#chordInputDen_${columnIndex}`).val());

    if (isNaN(currentInputNum) || currentInputNum <= 0) currentInputNum = 1;
    if (isNaN(currentInputDen) || currentInputDen <= 0) currentInputDen = 1;

    // Set context for this column's calculation
    state.currentTotalNum = currentInputNum;
    state.currentTotalDen = currentInputDen;
    state.hasPrimeGreaterThan89 = false;
    if (currentInputNum > 1 && U.getValue(U.getArray(currentInputNum)) !== currentInputNum) { state.hasPrimeGreaterThan89 = true; }
    if (currentInputDen > 1 && U.getValue(U.getArray(currentInputDen)) !== currentInputDen) { state.hasPrimeGreaterThan89 = true; }

    let smallestTerms = U.reduce(currentInputNum, currentInputDen);
    let numArray = U.getArray(smallestTerms[0]);
    let denArray = U.getArray(smallestTerms[1]);
    return U.diffArray(numArray, denArray);
}

/**
 * Calculates the combined input monzo for HEJI and Interval entry modes.
 * @returns {number[]} The combined monzo.
 */
function getCombinedInputSum() {
	state.hasPrimeGreaterThan89 = false;
	state.currentTotalNum = 1;
	state.currentTotalDen = 1;
    let combinedInputSum = C.reference;

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
        combinedInputSum = U.sumArray(sum, C.eightyNine[UI.getEightyNine()]);
    } else if ($("#intervalInput").prop("checked")){ 
        let numStackingFields = $("#stacking-input").val();
        for (let i = 1; i <= numStackingFields; i++) {
            let currentInputNum = parseInt($(`#inputNum_${i}`).val());
            let currentInputDen = parseInt($(`#inputDen_${i}`).val());

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
            combinedInputSum = U.sumArray(combinedInputSum, currentMonzo);
        }
    }
    return combinedInputSum;
}

// This function is deprecated and will be removed after refactoring is complete.
export function getInputSum(){}

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
}

export function getFrequency1to1(){
	state.freq1to1 = state.kammerTon 
		* Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
		* Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
		* Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12));
	$("#1to1Frequency").val(state.freq1to1.toFixed(4));
	doCalc();
}

export function getFrequencyKammerTon(){
	state.kammerTon = state.freq1to1
		/ Math.pow(2, (C.frequencyOctave[UI.getFrequencyOctave()] / 12)) 
		/ Math.pow(2, (C.frequencyNote[UI.getFrequencyNote()] / 12)) 
		/ Math.pow(2, (C.frequencyAccidental[UI.getFrequencyAccidental()] / 12));
	$("#frequencyA4").val(state.kammerTon.toFixed(4));
	doCalc();
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

export function getDisplayValues(columnIndex){
	state.displayNumValue = state.numValue;
	state.displayDenValue = state.denValue;
	
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

    if (state.displayNumValue <= 9007199254740991 && state.displayDenValue <= 9007199254740991){
        $("#num_" + columnIndex).text(state.displayNumValue);
        $("#den_" + columnIndex).text(state.displayDenValue);
        $("#ratioCopyHelper_" + columnIndex).text(state.displayNumValue + '/' + state.displayDenValue);
    } else {
        var float = state.displayNumValue / state.displayDenValue;
        $("#num_" + columnIndex).text(float);
        $("#den_" + columnIndex).text(1);
        $("#ratioCopyHelper_" + columnIndex).text(float + '/' + 1);
    }

	if (columnIndex === 1) {
        if (state.displayNumValue <= 9007199254740991 && state.displayDenValue <= 9007199254740991){
            var displayNumArray = U.getArray(state.displayNumValue);
            var displayDenArray = U.getArray(state.displayDenValue);
            var displayMeldoicSum = U.diffArray(displayNumArray, displayDenArray);
            $("#monzo").text(displayMeldoicSum);
            state.monzoMessage = "";
            $("#over31Message").text(state.monzoMessage);
        } else {
            $("#monzo").text("stack overflow");
            $("#over31Message").text("");
        }
    }
}

export function prepareCentsCalculationData() {
    if ($("#paletteInput").prop("checked")){ 
        let sum = U.sumArray(state.inputSum, C.refOctave[UI.getRefOctave()]);
        sum = U.sumArray(sum, C.refNote[UI.getRefNote()]);
        state.centsSum = U.sumArray(sum, C.refAccidental[UI.getRefAccidental()]);
    } else if ($("#intervalInput").prop("checked") || $("#chordInput").prop("checked")){
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
    const isRatioMode = $("#intervalInput").prop("checked") || $("#chordInput").prop("checked");
	if (isRatioMode){
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

export function getCentDeviation(columnIndex){
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

    let centsText;
    if (Math.round(state.centDeviation * 1e9) / 1e9 === 0) {
        centsText = "";
    } else if (state.centDeviation > 0) {
        centsText = "+" + state.centDeviation.toFixed(state.precision);
    } else {
        centsText = state.centDeviation.toFixed(state.precision);
    }
    
    // MIDI note is now handled in getPC() for each column
    $("#cents_" + columnIndex).text(centsText);
    
	UI.getBend();
    const isRatioMode = $("#intervalInput").prop("checked") || $("#chordInput").prop("checked");
	if (isRatioMode){
			state.cents_toRef = 1200*Math.log2((state.displayNumValue) / (state.displayDenValue));
	} else {
		state.cents_toRef = 1200*Math.log2((state.centsNumValue) / (state.centsDenValue));
	}
	if ($("#normalize").prop("checked")){
		state.cents_toRef = U.mod(state.cents_toRef,1200);
	}

    if (state.cents_toRef > 0) {
        $("#JIgross_" + columnIndex).text("+"+state.cents_toRef.toFixed(state.precision) + "c");
    } else{
        $("#JIgross_" + columnIndex).text(state.cents_toRef.toFixed(state.precision) + "c");
    }
}

export function getOutputFrequency(columnIndex){
	var outputFreq = state.freq1to1 * (state.displayNumValue / state.displayDenValue);
    $("#frequency_" + columnIndex).text(outputFreq.toFixed(state.precision)+"Hz");
}

export function getCurrentCents(){
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