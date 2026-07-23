
import * as C from './constants.js';
import * as U from './utils.js';
import { state } from './state.js';
import { calculateEdoNotation } from './edo.js'; // Import the new EDO notation function
import { getEnharmonicVariants } from './sagittal-Calculator.js';

// Functions to retrieve input values 
export function getRefOctave(){
	return $("#octaveDropdown").val();
}

export function getRefNote(){
	return $("#diatonicNoteDropdown").val();
}

export function getDiatonicNoteOffset(){
    const defaultValue = 1; // C is the default value with an index of 1
    const selectedValue = parseInt($("#diatonicNoteDropdown").val());
    return selectedValue - defaultValue;
}

export function getRefAccidental(){
	return $("#refAccidentalDropdown").val();
}

export function getRefAccidentalOffset(){
    const defaultValue = 1; // 'j' (natural) is the default value with an index of 1
    const selectedValue = parseInt($("#refAccidentalDropdown").val());
    return selectedValue - defaultValue;
}

export function getRefAccidentalMonzo(){
    const selectedValue = parseInt($("#refAccidentalDropdown").val());
    return C.refAccidental[selectedValue];
}

export function getShowEnharmonics(){
    return $("#showEnharmonics").prop("checked");
}

export function getExcludeHalves(){
    return $("#excludeHalvesCheckbox").prop("checked");
}

export function getFrequencyOctave(){
	return $("#octaveDropdown").val();
}

export function getFrequencyNote(){
	return $("#diatonicNoteDropdown").val();
}

export function getFrequencyAccidental(){
	return $("#refAccidentalDropdown").val();
}

export function getOctave(){
	return $("#hejiOctaveDropdown").val();
}

export function getNote(){
	return $("#hejiDiatonicNoteDropdown").val();
}

export function getChromatic(){
	return $(".chromatic.selected").attr("value");
}

export function getSyntonic(){
	return $(".syntonic.selected").attr("value");
}

export function getSeptimal(){
	return $(".septimal.selected").attr("value");
}

export function getUndecimal(){
	return $(".undecimal.selected").attr("value");
}

export function getTridecimal(){
	return $(".tridecimal.selected").attr("value");
}

export function getSeventeen(){
	return $(".seventeen.selected").attr("value");
}

export function getNineteen(){
	return $(".nineteen.selected").attr("value");
}

export function getTwentyThree(){
	return $(".twentyThree.selected").attr("value");
}

export function getTwentyNine(){
	return $(".twentyNine.selected").attr("value");
}

export function getThirtyOne(){
	return $(".thirtyOne.selected").attr("value");
}

export function getThirtySeven(){
	return $(".thirtySeven.selected").attr("value");
}

export function getFortyOne(){
	return $(".fortyOne.selected").attr("value");
}

export function getFortyThree(){
	return $(".fortyThree.selected").attr("value");
}

export function getFortySeven(){
	return $(".fortySeven.selected").attr("value");
}

export function getFiftyThree(){
	return $(".fiftyThree.selected").attr("value");
}

export function getFiftyNine(){
	return $(".fiftyNine.selected").attr("value");
}

export function getSixtyOne(){
	return $(".sixtyOne.selected").attr("value");
}

export function getSixtySeven(){
	return $(".sixtySeven.selected").attr("value");
}

export function getSeventyOne(){
	return $(".seventyOne.selected").attr("value");
}

export function getSeventyThree(){
	return $(".seventyThree.selected").attr("value");
}

export function getSeventyNine(){
	return $(".seventyNine.selected").attr("value");
}

export function getEightyThree(){
	return $(".eightyThree.selected").attr("value");
}

export function getEightyNine(){
	return $(".eightyNine.selected").attr("value");
}

export function getFrequency(){
	return $(".frequency").attr("value");
}

export function getSavedNum(){
	return $(".savedNum").attr("value");
}

export function getSavedDen(){
	return $(".savedDen").attr("value");
}

export function getInputNum(){
	return $(".inputNum").attr("value");
}

export function getInputDen(){
	return $(".inputDen").attr("value");
}

export function generateStackingRatioFields(numFields) {
    let container = $("#dynamic-ratio-fields-container");
    container.empty(); // Clear existing dynamic fields

    for (let i = 1; i <= numFields; i++) {
        let ratioHtml = ``;
        if (i > 1) { // Only add "×" for subsequent fields
            ratioHtml += `<br><br><div class="times-symbol">×</div>`;
        }
        ratioHtml += `
            <div class="interval-column">
                <br><br>
				<input type="number" class="ratioIn" id="inputNum_${i}" minlength="1" required value="1"></input>
                <input type="number" class="ratioIn" id="inputDen_${i}"  minlength="1" required value="1"></input>
                <div class="interval-button-group">
                    <button id="loadCurrentPitch_${i}" class="getCurrentPitch interval-button" onclick="loadCurrentPitch(${i})">load</button>
                    <button id="clearRatio_${i}" class="clearInputRatio interval-button" onclick="clearRatio(${i})">clear</button>
                </div>
            </div>
        `;
        container.append(ratioHtml);
    }
    
    // Attach change event handlers to dynamically created inputs for Interval Entry mode
    // These handlers will update state and trigger calculations
    container.off('change', '.ratioIn').on('change', '.ratioIn', function() {
        // Trigger calculations when any stacking ratio field changes
        // Import Calc from calculator.js would go here, but since we're in UI module,
        // we need to trigger doCalc through a different method
        // For now, dispatch a custom event that main.js can listen to
        $(document).trigger('dynamicRatioChanged');
    });
}

export function generateOutputColumns(numColumns) {
    let outputContainer = $(".output-container"); 
    outputContainer.empty(); // Clear existing columns

    for (let i = 1; i <= numColumns; i++) {
        let columnHtml = `
            <div class="output-column">
                <em><div id="undefinedNotation_${i}"></div></em>
				<div class="notation-display-container">
                    <div class="noteName" id="noteName_${i}"></div><!--
                    --><div class="notationOutput" id="notationOutput_${i}"></div>
                </div>
                <div class="output-region-ratio">
                    <div class="ratio-display-container">
                        <div id="num_${i}" class="num" value="1"></div>
                        <div id="den_${i}" class="den" value="1"></div>
                        <span id="ratioCopyHelper_${i}" style="position: absolute; left: -9999px;"></span>
                    </div>
                </div>
                <div class="output-region-values">
                    <div class="output-content">
                        <span id="midiNote_${i}"></span><span id="midiAccidental_${i}" class="midiAccidental"></span><span id="cents_${i}" value="0"></span>
                    </div>
                    <div class="output-content">
                        <div type="text" id="frequency_${i}" value="440"></div>
                    </div>
                    <div class="output-content">
                        <div id="JIgross_${i}" value="0">0</div>
                    </div>
                </div>
            </div>
        `;
        outputContainer.append(columnHtml);
    }
}

// Function to update state.currentReferenceMonzo
export function updateCurrentReferenceMonzo() {
    let referenceSum = U.diffArray(C.refOctave[getRefOctave()], C.refNote[getRefNote()]);
    referenceSum = U.diffArray(referenceSum, C.refAccidental[getRefAccidental()]);
    state.currentReferenceMonzo = referenceSum;
}

// get HE notation output 
export function getPC(columnIndex){
	var inverseSum = U.diffArray(state.displaySum, C.refOctave[getRefOctave()]);
    inverseSum = U.diffArray(inverseSum, C.refNote[getRefNote()]);
    inverseSum = U.diffArray(inverseSum, C.refAccidental[getRefAccidental()]);

	// state.currentReferenceMonzo is now updated by updateCurrentReferenceMonzo()
	var refArray = U.productArray(state.currentReferenceMonzo, C.tonalIdentity);

    let tonalArray;
    // Sagittal Entry and Johnston Entry are absolute-pitch entry modes like
    // HEJI Entry, so they follow the palette path everywhere in this function.
    const isAbsoluteEntry = $("#paletteInput").prop("checked") || $("#sagittalEntryInput").prop("checked") || $("#johnstonInput").prop("checked");
	if (isAbsoluteEntry){
        const refAccidentalMonzo = getRefAccidentalMonzo();
        const adjustedDisplaySum = U.diffArray(state.displaySum, refAccidentalMonzo);
		tonalArray = U.productArray(adjustedDisplaySum, C.tonalIdentity);
	} else if ($("#intervalInput").prop("checked") || $("#chordInput").prop("checked")){
		tonalArray = U.productArray(inverseSum, C.tonalIdentity);
	}
	var refArraySum = U.sum(refArray);
	var tonalArraySum = U.sum(tonalArray);
	var refpc = U.mod((refArraySum + 4),7);
	var pc;
if (isAbsoluteEntry){
    pc = U.mod((refpc + tonalArraySum),7);
} else {
    pc = U.mod((tonalArraySum + 4),7); // For other Entry areas, map -3 to C (original logic)
}
	var outputDiatonic = C.diatonicOutput[pc];
	var ref12;
	if (refpc == 0){
		ref12 = 5;
	} else if (refpc == 1){
		ref12 = 0;
	} else if (refpc == 2){
		ref12 = 7;
	} else if (refpc == 3){
		ref12 = 2;
	} else if (refpc == 4){
		ref12 = 9;
	} else if (refpc == 5){
		ref12 = 4;
	} else if (refpc == 6){
		ref12 = 11;
	}
	const refAcc = parseInt(getRefAccidental());
	if (refAcc === 0) { // ♭
		state.ref12acc = 1;
	} else if (refAcc === 2) { // ♯
		state.ref12acc = -1;
	} else { // ♮
		state.ref12acc = 0;
	}
	state.diat_to_refTempered = (C.diatonicTempered[pc] - C.diatonicTempered[refpc] + (100 * state.ref12acc) + 1200.0) % 1200.0;
	state.cents_from_diatonic_tempered = ((((state.cents_toRef % 1200.0) + 1200.0) % 1200.0) - state.diat_to_refTempered + 1200.0) % 1200.0;
	getBend();
	var refNat = 7 * state.ref12acc;
	var note = U.mod(((((ref12 * 100) + state.jiCents ) / 100).toFixed(0) - state.ref12acc),12);
	var refMidiNoteOutput = C.refMidiNote[note];
	var natural = "";
	var pythag = "";
	var septimal = "";
	var undecimal = "";
	var tridecimal = "";
	var seventeen = "";
	var nineteen = "";
	var twentyThree = "";
	var twentyNine = "";
	var thirtyOne = "";
	var thirtySeven = "";
	var fortyOne = "";
	var fortyThree = "";
	var fortySeven = "";
	var fiftyThree = "";
	var fiftyNine = "";
	var sixtyOne = "";
	var sixtySeven = "";
	var seventyOne = "";
	var seventyThree = "";
	var seventyNine = "";
	var eightyThree = "";
	var eightyNine = "";
	var chromatic;
	if (isAbsoluteEntry) {
        const diatonicOffset = getDiatonicNoteOffset();
        const accidentalOffset = getRefAccidentalOffset();
        chromatic = tonalArraySum + (22 + diatonicOffset + accidentalOffset); // Adjusted for HEJI Entry with dynamic offsets
    } else {
        chromatic = tonalArraySum + 25; // Original logic for other Entry areas
    }
	// display natural on diatonic pitch classes 
	if ((state.displaySum[1] - refNat + refpc - 4 == -4 || 
		state.displaySum[1] - refNat + refpc - 4 == -3 || 
		state.displaySum[1] - refNat + refpc - 4 == -2 || 
		state.displaySum[1] - refNat + refpc - 4 == -1 || 
		state.displaySum[1] - refNat + refpc - 4 == 0 || 
		state.displaySum[1] - refNat + refpc - 4 == 1 || 
		state.displaySum[1] - refNat + refpc - 4 == 2) 
		&& state.displaySum[2] == 0 
		&& state.displaySum[3] == 0 
		&& state.displaySum[4] == 0 
		&& state.displaySum[5] == 0 
		&& state.displaySum[6] == 0 
		&& state.displaySum[7] == 0 
		&& state.displaySum[8] == 0 
		&& state.displaySum[9] == 0 
		&& state.displaySum[10] == 0 
		&& state.displaySum[11] == 0 
		&& state.displaySum[12] == 0 
		&& state.displaySum[13] == 0 
		&& state.displaySum[14] == 0 
		&& state.displaySum[15] == 0 
		&& state.displaySum[16] == 0 
		&& state.displaySum[17] == 0 
		&& state.displaySum[18] == 0 
		&& state.displaySum[19] == 0 
		&& state.displaySum[20] == 0 
		&& state.displaySum[21] == 0 
		&& state.displaySum[22] == 0 
		&& state.displaySum[23] == 0){
		natural = "n"; 
	} else {
		natural = "";
	}
	// rest of the combinations
	if (state.displaySum[2] == -4){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveUpUpUpUp[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveUpUpUpUp[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveUpUpUpUp[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveUpUpUpUp[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveUpUpUpUp[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveUpUpUpUp[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveUpUpUpUp[6];
		}
	} else if (state.displaySum[2] == -3){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveUpUpUp[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveUpUpUp[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveUpUpUp[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveUpUpUp[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveUpUpUp[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveUpUpUp[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveUpUpUp[6];
		}
	} else if (state.displaySum[2] == -2){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveUpUp[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveUpUp[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveUpUp[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveUpUp[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveUpUp[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveUpUp[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveUpUp[6];
		}
	} else if (state.displaySum[2] == -1){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveUp[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveUp[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveUp[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveUp[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveUp[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveUp[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveUp[6];
		}
	} else if (state.displaySum[2] == 0){
		if (chromatic >= 0 && chromatic <= 6){
			pythag = C.pythagOutput[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.pythagOutput[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.pythagOutput[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.pythagOutput[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.pythagOutput[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.pythagOutput[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.pythagOutput[6];
		}
	} else if (state.displaySum[2] == 1){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveDown[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveDown[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveDown[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveDown[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveDown[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveDown[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveDown[6];
		}
	} else if (state.displaySum[2] == 2){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveDownDown[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveDownDown[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveDownDown[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveDownDown[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveDownDown[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveDownDown[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveDownDown[6];
		}
	} else if (state.displaySum[2] == 3){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveDownDownDown[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveDownDownDown[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveDownDownDown[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveDownDownDown[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveDownDownDown[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveDownDownDown[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveDownDownDown[6];
		}
	} else if (state.displaySum[2] == 4){
		if (chromatic>=0 && chromatic <= 6){
			pythag = C.fiveDownDownDownDown[0];
		} else if (chromatic >= 7 && chromatic <= 13){
			pythag = C.fiveDownDownDownDown[1];
		} else if (chromatic >= 14 && chromatic <= 20){
			pythag = C.fiveDownDownDownDown[2];
		} else if (chromatic >= 21 && chromatic <= 27){
			pythag = C.fiveDownDownDownDown[3];
		} else if (chromatic >= 28 && chromatic <= 34){
			pythag = C.fiveDownDownDownDown[4];
		} else if (chromatic >= 35 && chromatic <= 41){
			pythag = C.fiveDownDownDownDown[5];
		} else if (chromatic >= 42 && chromatic <= 48){
			pythag = C.fiveDownDownDownDown[6];
		}
	}
	if (state.displaySum[3] == -3){
		septimal = C.septimalSymbols[6];
	} else if (state.displaySum[3] == -2){
		septimal = C.septimalSymbols[5];
	} else if (state.displaySum[3] == -1){
		septimal = C.septimalSymbols[4];
	} else if (state.displaySum[3] == 0){
		septimal = C.septimalSymbols[3];
	} else if (state.displaySum[3] == 1){
		septimal = C.septimalSymbols[2];
	} else if (state.displaySum[3] == 2){
		septimal = C.septimalSymbols[1];
	} else if (state.displaySum[3] == 3){
		septimal = C.septimalSymbols[0];
	} 
	if (state.displaySum[4] == 3){
		undecimal = C.undecimalSymbols[6];
	} else if (state.displaySum[4] == 2){
		undecimal = C.undecimalSymbols[5];
	} else if (state.displaySum[4] == 1){
		undecimal = C.undecimalSymbols[4];
	} else if (state.displaySum[4] == 0){
		undecimal = C.undecimalSymbols[3];
	} else if (state.displaySum[4] == -1){
		undecimal = C.undecimalSymbols[2];
	} else if (state.displaySum[4] == -2){
		undecimal = C.undecimalSymbols[1];
	} else if (state.displaySum[4] == -3){
		undecimal = C.undecimalSymbols[0];
	} 
	if (state.displaySum[5] == -3){
		tridecimal = C.tridecimalSymbols[6];
	} else if (state.displaySum[5] == -2){
		tridecimal = C.tridecimalSymbols[5];
	} else if (state.displaySum[5] == -1){
		tridecimal = C.tridecimalSymbols[4];
	} else if (state.displaySum[5] == 0){
		tridecimal = C.tridecimalSymbols[3];
	} else if (state.displaySum[5] == 1){
		tridecimal = C.tridecimalSymbols[2];
	} else if (state.displaySum[5] == 2){
		tridecimal = C.tridecimalSymbols[1];
	} else if (state.displaySum[5] == 3){
		tridecimal = C.tridecimalSymbols[0];
	} 
	if (state.displaySum[6] == -3){
		seventeen = C.seventeenSymbols[6];
	} else if (state.displaySum[6] == -2){
		seventeen = C.seventeenSymbols[5];
	} else if (state.displaySum[6] == -1){
		seventeen = C.seventeenSymbols[4];
	} else if (state.displaySum[6] == 0){
		seventeen = C.seventeenSymbols[3];
	} else if (state.displaySum[6] == 1){
		seventeen = C.seventeenSymbols[2];
	} else if (state.displaySum[6] == 2){
		seventeen = C.seventeenSymbols[1];
	} else if (state.displaySum[6] == 3){
		seventeen = C.seventeenSymbols[0];
	}
	if (state.displaySum[7] == -3){
		nineteen = C.nineteenSymbols[0];
	} else if (state.displaySum[7] == -2){
		nineteen = C.nineteenSymbols[1];
	} else if (state.displaySum[7] == -1){
		nineteen = C.nineteenSymbols[2];
	} else if (state.displaySum[7] == 0){
		nineteen = C.nineteenSymbols[3];
	} else if (state.displaySum[7] == 1){
		nineteen = C.nineteenSymbols[4];
	} else if (state.displaySum[7] == 2){
		nineteen = C.nineteenSymbols[5];
	} else if (state.displaySum[7] == 3){
		nineteen = C.nineteenSymbols[6];
	}
	if (state.displaySum[8] == -3){
		twentyThree = C.twentyThreeSymbols[0];
	} else if (state.displaySum[8] == -2){
		twentyThree = C.twentyThreeSymbols[1];
	} else if (state.displaySum[8] == -1){
		twentyThree = C.twentyThreeSymbols[2];
	} else if (state.displaySum[8] == 0){
		twentyThree = C.twentyThreeSymbols[3];
	} else if (state.displaySum[8] == 1){
		twentyThree = C.twentyThreeSymbols[4];
	} else if (state.displaySum[8] == 2){
		twentyThree = C.twentyThreeSymbols[5];
	} else if (state.displaySum[8] == 3){
		twentyThree = C.twentyThreeSymbols[6];
	}
	if (state.displaySum[9] == 3){
		twentyNine = C.twentyNineSymbols[6];
	} else if (state.displaySum[9] == 2){
		twentyNine = C.twentyNineSymbols[5];
	} else if (state.displaySum[9] == 1){
		twentyNine = C.twentyNineSymbols[4];
	} else if (state.displaySum[9] == 0){
		twentyNine = C.twentyNineSymbols[3];
	} else if (state.displaySum[9] == -1){
		twentyNine = C.twentyNineSymbols[2];
	} else if (state.displaySum[9] == -2){
		twentyNine = C.twentyNineSymbols[1];
	} else if (state.displaySum[9] == -3){
		twentyNine = C.twentyNineSymbols[0];
	}
	if (state.displaySum[10] == -3){
		thirtyOne = C.thirtyOneSymbols[6];
	} else if (state.displaySum[10] == -2){
		thirtyOne = C.thirtyOneSymbols[5];
	} else if (state.displaySum[10] == -1){
		thirtyOne = C.thirtyOneSymbols[4];
	} else if (state.displaySum[10] == 0){
		thirtyOne = C.thirtyOneSymbols[3];
	} else if (state.displaySum[10] == 1){
		thirtyOne = C.thirtyOneSymbols[2];
	} else if (state.displaySum[10] == 2){
		thirtyOne = C.thirtyOneSymbols[1];
	} else if (state.displaySum[10] == 3){
		thirtyOne = C.thirtyOneSymbols[0];
	}
	if (state.displaySum[11] == 3){
		thirtySeven = C.thirtySevenSymbols[6];
	} else if (state.displaySum[11] == 2){
		thirtySeven = C.thirtySevenSymbols[5];
	} else if (state.displaySum[11] == 1){
		thirtySeven = C.thirtySevenSymbols[4];
	} else if (state.displaySum[11] == 0){
		thirtySeven = C.thirtySevenSymbols[3];
	} else if (state.displaySum[11] == -1){
		thirtySeven = C.thirtySevenSymbols[2];
	} else if (state.displaySum[11] == -2){
		thirtySeven = C.thirtySevenSymbols[1];
	} else if (state.displaySum[11] == -3){
		thirtySeven = C.thirtySevenSymbols[0];
	}
	if (state.displaySum[12] == 3){
		fortyOne = C.fortyOneSymbols[6];
	} else if (state.displaySum[12] == 2){
		fortyOne = C.fortyOneSymbols[5];
	} else if (state.displaySum[12] == 1){
		fortyOne = C.fortyOneSymbols[4];
	} else if (state.displaySum[12] == 0){
		fortyOne = C.fortyOneSymbols[3];
	} else if (state.displaySum[12] == -1){
		fortyOne = C.fortyOneSymbols[2];
	} else if (state.displaySum[12] == -2){
		fortyOne = C.fortyOneSymbols[1];
	} else if (state.displaySum[12] == -3){
		fortyOne = C.fortyOneSymbols[0];
	}
	if (state.displaySum[13] == 3){
		fortyThree = C.fortyThreeSymbols[6];
	} else if (state.displaySum[13] == 2){
		fortyThree = C.fortyThreeSymbols[5];
	} else if (state.displaySum[13] == 1){
		fortyThree = C.fortyThreeSymbols[4];
	} else if (state.displaySum[13] == 0){
		fortyThree = C.fortyThreeSymbols[3];
	} else if (state.displaySum[13] == -1){
		fortyThree = C.fortyThreeSymbols[2];
	} else if (state.displaySum[13] == -2){
		fortyThree = C.fortyThreeSymbols[1];
	} else if (state.displaySum[13] == -3){
		fortyThree = C.fortyThreeSymbols[0];
	}
	if (state.displaySum[14] == 3){
		fortySeven = C.fortySevenSymbols[6];
	} else if (state.displaySum[14] == 2){
		fortySeven = C.fortySevenSymbols[5];
	} else if (state.displaySum[14] == 1){
		fortySeven = C.fortySevenSymbols[4];
	} else if (state.displaySum[14] == 0){
		fortySeven = C.fortySevenSymbols[3];
	} else if (state.displaySum[14] == -1){
		fortySeven = C.fortySevenSymbols[2];
	} else if (state.displaySum[14] == -2){
		fortySeven = C.fortySevenSymbols[1];
	} else if (state.displaySum[14] == -3){
		fortySeven = C.fortySevenSymbols[0];
	}
	if (state.displaySum[15] == 3){
		fiftyThree = C.fiftyThreeSymbols[6];
	} else if (state.displaySum[15] == 2){
		fiftyThree = C.fiftyThreeSymbols[5];
	} else if (state.displaySum[15] == 1){
		fiftyThree = C.fiftyThreeSymbols[4];
	} else if (state.displaySum[15] == 0){
		fiftyThree = C.fiftyThreeSymbols[3];
	} else if (state.displaySum[15] == -1){
		fiftyThree = C.fiftyThreeSymbols[2];
	} else if (state.displaySum[15] == -2){
		fiftyThree = C.fiftyThreeSymbols[1];
	} else if (state.displaySum[15] == -3){
		fiftyThree = C.fiftyThreeSymbols[0];
	}
	if (state.displaySum[16] == 3){
		fiftyNine = C.fiftyNineSymbols[6];
	} else if (state.displaySum[16] == 2){
		fiftyNine = C.fiftyNineSymbols[5];
	} else if (state.displaySum[16] == 1){
		fiftyNine = C.fiftyNineSymbols[4];
	} else if (state.displaySum[16] == 0){
		fiftyNine = C.fiftyNineSymbols[3];
	} else if (state.displaySum[16] == -1){
		fiftyNine = C.fiftyNineSymbols[2];
	} else if (state.displaySum[16] == -2){
		fiftyNine = C.fiftyNineSymbols[1];
	} else if (state.displaySum[16] == -3){
		fiftyNine = C.fiftyNineSymbols[0];
	}
	if (state.displaySum[17] == 3){
		sixtyOne = C.sixtyOneSymbols[6];
	} else if (state.displaySum[17] == 2){
		sixtyOne = C.sixtyOneSymbols[5];
	} else if (state.displaySum[17] == 1){
		sixtyOne = C.sixtyOneSymbols[4];
	} else if (state.displaySum[17] == 0){
		sixtyOne = C.sixtyOneSymbols[3];
	} else if (state.displaySum[17] == -1){
		sixtyOne = C.sixtyOneSymbols[2];
	} else if (state.displaySum[17] == -2){
		sixtyOne = C.sixtyOneSymbols[1];
	} else if (state.displaySum[17] == -3){
		sixtyOne = C.sixtyOneSymbols[0];
	}
	if (state.displaySum[18] == 3){
		sixtySeven = C.sixtySeventhSymbols[6];
	} else if (state.displaySum[18] == 2){
		sixtySeven = C.sixtySeventhSymbols[5];
	} else if (state.displaySum[18] == 1){
		sixtySeven = C.sixtySeventhSymbols[4];
	} else if (state.displaySum[18] == 0){
		sixtySeven = C.sixtySeventhSymbols[3];
	} else if (state.displaySum[18] == -1){
		sixtySeven = C.sixtySeventhSymbols[2];
	} else if (state.displaySum[18] == -2){
		sixtySeven = C.sixtySeventhSymbols[1];
	} else if (state.displaySum[18] == -3){
		sixtySeven = C.sixtySeventhSymbols[0];
	}
	if (state.displaySum[19] == 3){
		seventyOne = C.seventyOneSymbols[6];
	} else if (state.displaySum[19] == 2){
		seventyOne = C.seventyOneSymbols[5];
	} else if (state.displaySum[19] == 1){
		seventyOne = C.seventyOneSymbols[4];
	} else if (state.displaySum[19] == 0){
		seventyOne = C.seventyOneSymbols[3];
	} else if (state.displaySum[19] == -1){
		seventyOne = C.seventyOneSymbols[2];
	} else if (state.displaySum[19] == -2){
		seventyOne = C.seventyOneSymbols[1];
	} else if (state.displaySum[19] == -3){
		seventyOne = C.seventyOneSymbols[0];
	}
	if (state.displaySum[20] == 3){
		seventyThree = C.seventyThreeSymbols[6];
	} else if (state.displaySum[20] == 2){
		seventyThree = C.seventyThreeSymbols[5];
	} else if (state.displaySum[20] == 1){
		seventyThree = C.seventyThreeSymbols[4];
	} else if (state.displaySum[20] == 0){
		seventyThree = C.seventyThreeSymbols[3];
	} else if (state.displaySum[20] == -1){
		seventyThree = C.seventyThreeSymbols[2];
	} else if (state.displaySum[20] == -2){
		seventyThree = C.seventyThreeSymbols[1];
	} else if (state.displaySum[20] == -3){
		seventyThree = C.seventyThreeSymbols[0];
	}
	if (state.displaySum[21] == 3){
		seventyNine = C.seventyNineSymbols[6];
	} else if (state.displaySum[21] == 2){
		seventyNine = C.seventyNineSymbols[5];
	} else if (state.displaySum[21] == 1){
		seventyNine = C.seventyNineSymbols[4];
	} else if (state.displaySum[21] == 0){
		seventyNine = C.seventyNineSymbols[3];
	} else if (state.displaySum[21] == -1){
		seventyNine = C.seventyNineSymbols[2];
	} else if (state.displaySum[21] == -2){
		seventyNine = C.seventyNineSymbols[1];
	} else if (state.displaySum[21] == -3){
		seventyNine = C.seventyNineSymbols[0];
	}
	if (state.displaySum[22] == 3){
		eightyThree = C.eightyThreeSymbols[6];
	} else if (state.displaySum[22] == 2){
		eightyThree = C.eightyThreeSymbols[5];
	} else if (state.displaySum[22] == 1){
		eightyThree = C.eightyThreeSymbols[4];
	} else if (state.displaySum[22] == 0){
		eightyThree = C.eightyThreeSymbols[3];
	} else if (state.displaySum[22] == -1){
		eightyThree = C.eightyThreeSymbols[2];
	} else if (state.displaySum[22] == -2){
		eightyThree = C.eightyThreeSymbols[1];
	} else if (state.displaySum[22] == -3){
		eightyThree = C.eightyThreeSymbols[0];
	}
	if (state.displaySum[23] == 3){
		eightyNine = C.eightyNineSymbols[6];
	} else if (state.displaySum[23] == 2){
		eightyNine = C.eightyNineSymbols[5];
	} else if (state.displaySum[23] == 1){
		eightyNine = C.eightyNineSymbols[4];
	} else if (state.displaySum[23] == 0){
		eightyNine = C.eightyNineSymbols[3];
	} else if (state.displaySum[23] == -1){
		eightyNine = C.eightyNineSymbols[2];
	} else if (state.displaySum[23] == -2){
		eightyNine = C.eightyNineSymbols[1];
	} else if (state.displaySum[23] == -3){
		eightyNine = C.eightyNineSymbols[0];
	}
	var heji2String = fortySeven + fortyThree + fortyOne + thirtySeven + thirtyOne + twentyNine + twentyThree + nineteen + seventeen + tridecimal + undecimal + septimal + pythag + natural;
	var hejiExtensionsPath = eightyNine + eightyThree + seventyNine + seventyThree + seventyOne + sixtySeven + sixtyOne + fiftyNine + fiftyThree;

	// Apply the 'n' to ' ' replacement only to the part displayed with HEJI2 font, if 'natural' contributed 'n'
	let displayedHeji2String = heji2String;
	if (natural === "n") { // Check if 'natural' specifically contributed an 'n'
		displayedHeji2String = displayedHeji2String.replace(/n/g, ' '); // Replace all 'n' with ' ' in this specific context
	}

	// Row alignment is handled by the fixed-height .notation-display-container in CSS;
	// no per-state padding/offset compensation is needed.
	var notationString;
	var undefinedNotation;
	// Check if HEJI notation is uncalculatable
	if ((($("#intervalInput").prop("checked") || $("#chordInput").prop("checked")) && (
		state.hasPrimeGreaterThan89 || // If prime > 89 is present
		(heji2String.trim().length === 0 && hejiExtensionsPath.trim().length === 0 && natural.trim().length === 0) // Or if no HEJI symbols are found
	)) ||
		// With "unofficial extensions" unchecked, primes 53-89 fall outside the (official 47) limit
		// regardless of entry mode, including symbols selected directly in HEJI Entry
		(!$("#unofficialExtensionsOutput").prop("checked") && state.displaySum.slice(15, 24).some(v => v !== 0))
	) {
		notationString = "<span style='font-family: monospace;'>n/a</span>";
		outputDiatonic = "";
		undefinedNotation = ""; // Clear undefinedNotation as we are explicitly showing n/a
	} else {
		notationString = '<span class="heji-extensions">' + hejiExtensionsPath + '</span>' + '<span class="heji2">' + displayedHeji2String + '</span>';
		undefinedNotation = "";
		state.monzoMessage = "";
	}

	const parsedMidiNote = parseMidiNoteOutput(refMidiNoteOutput); // Calculate for this column
	
	// Update only this specific column's HEJI notation
	$("#notationOutput_" + columnIndex).html(notationString);
	$("#noteName_" + columnIndex).html(outputDiatonic);
	$("#undefinedNotation_" + columnIndex).html(undefinedNotation);
	$("#midiNote_" + columnIndex).text(parsedMidiNote.letter);
	if (parsedMidiNote.accidental === "j") {
		$("#midiAccidental_" + columnIndex).text("");
	} else {
		$("#midiAccidental_" + columnIndex).text(parsedMidiNote.accidental);
	}

    return ref12; // Return ref12 for external use
}

export function getBend() {
	if ($("#bendParameter").val() == 1) {
		if ($("#refFrequencyFreeRadio").prop("checked")) {
			var diatonicCentsDiff = state.cents_from_diatonic_tempered - (1200 * Math.log2(state.kammerTon / 440));
		} else {
			var diatonicCentsDiff = state.cents_from_diatonic_tempered;
		}
		if (diatonicCentsDiff > 600.0) {
			diatonicCentsDiff = diatonicCentsDiff - 1200.0;
		}
		// Sibelius pitch bend
		var sibelius_z = Math.round(diatonicCentsDiff / (state.sibeliusRange/2) * 128 * 32);
		var sibelius_delta = Math.floor(sibelius_z / 128);
		var sibelius_x = 64 + sibelius_delta;
		var sibelius_y = Math.round(sibelius_z - (sibelius_delta*128));
		if (sibelius_x < 0 || sibelius_x > 127) {
			$("#sibelius_bend").text("out of range");
		} else {
			$("#sibelius_bend").text("~B "+sibelius_y+","+sibelius_x);
		}
		// Finale bend
		var xbend_delta = Math.round((diatonicCentsDiff / (state.midiRange/8192)));
		if (xbend_delta < -8191 || xbend_delta > 8192) {
			$("#xbend").text("out of range");
		} else {	
			$("#xbend").text(xbend_delta);
		}

		// Musescore bend
		if (diatonicCentsDiff > 200 || diatonicCentsDiff < -200) {
			$("#musescore_cents").text("out of range");
		} else {
			$("#musescore_cents").text(diatonicCentsDiff.toFixed(2));
		}
	} else {
		var sibelius_z = Math.round(state.centDeviation / (state.sibeliusRange/2) * 128 * 32);
		var sibelius_delta = Math.floor(sibelius_z / 128);
		var sibelius_x = 64 + sibelius_delta;
		var sibelius_y = Math.round(sibelius_z - (sibelius_delta*128));
		$("#sibelius_bend").text("~B "+sibelius_y+","+sibelius_x);

		// Finale bend
		var xbend_delta = Math.round((state.centDeviation / (state.midiRange/8192)));
			$("#xbend").text(xbend_delta);

		// Musescore bend
		$("#musescore_cents").text(state.centDeviation.toFixed(2));
	} 
}

function toSubscriptNumber(value) {
    return String(value)
        .split('')
        .map(digit => '₀₁₂₃₄₅₆₇₈₉'[parseInt(digit, 10)] || digit)
        .join('');
}

function formatOctaveSubscript(frequency) {
    if (!frequency || !Number.isFinite(frequency)) {
        return '';
    }

    const midiNumber = Math.round((12 * Math.log2(frequency / 440)) + 69);
    const octave = Math.floor(midiNumber / 12) - 1;
    return octave >= 0 ? toSubscriptNumber(octave) : '';
}

function formatCentsLabel(centsValue) {
    if (Math.round(centsValue * 1e9) / 1e9 === 0) {
        return '';
    }
    if (centsValue > 0) {
        return `+${centsValue.toFixed(state.precision)}`;
    }
    return centsValue.toFixed(state.precision);
}

// Helper function to parse MIDI note output
export function parseMidiNoteOutput(midiNoteString) {
    let letter = '';
    let accidentalCode = '';

    const primaryPart = midiNoteString.split(' | ')[0]; // Take the first part for ambiguous cases

    const accidentalMatch = primaryPart.match(/^\*(\w{2})/);
    if (accidentalMatch) {
        accidentalCode = accidentalMatch[1];
        letter = primaryPart.substring(3); // Remove "*nt" part
    } else {
        letter = primaryPart; // Fallback, though current data should always have code
    }

    let heji2Accidental = '';
    switch (accidentalCode) {
        case 'nt': heji2Accidental = 'j'; break; // Natural
        case 'st': heji2Accidental = 'z'; break; // Sharp
        case 'ft': heji2Accidental = 'a'; break; // Flat
        default: heji2Accidental = ''; break;
    }

    return { letter: letter, accidental: heji2Accidental };
}

export function generateChordRatioFields(numFields) {
    let container = $("#chord-ratio-fields-container");
    container.empty();

    for (let i = 1; i <= numFields; i++) {
        let ratioHtml = ``;
        if (i > 1) {
            ratioHtml += `<div class="times-symbol">,</div>`;
        }
        ratioHtml += `
            <div class="interval-column">
                <input type="number" class="ratioIn chord-ratio-in" id="chordInputNum_${i}" value="1"></input>
                <input type="number" class="ratioIn chord-ratio-in" id="chordInputDen_${i}" value="1"></input>
                <div class="interval-button-group">
                    <button class="getCurrentPitch interval-button" onclick="loadCurrentPitchToChord(${i})">load</button>
                    <button class="clearInputRatio interval-button" onclick="clearChordRatio(${i})">clear</button>
                </div>
            </div>
        `;
        container.append(ratioHtml);
    }
}

export function generateSagittalOutputColumns(numColumns) {
    const container = $('.sagittal-output-container');
    container.empty();

    for (let i = 1; i <= numColumns; i++) {
        const columnHtml = `
            <div class="output-column sagittal-output-column">
                <div class="sagittal-variants" id="sagittalVariants_${i}"></div>
                <div class="output-region-ratio"></div>
                <div class="output-region-values">
                    <div id="sagittalError_${i}"></div>
                    <div class="output-content">
                        <div type="text" id="sagittalFrequency_${i}" value="440"></div>
                    </div>
                    <div class="output-content">
                        <div id="sagittalJIgross_${i}" value="0">0</div>
                    </div>
                </div>
            </div>
        `;
        container.append(columnHtml);
    }
}

// Helper function: Get note name from accidental type
function getNoteName(accidental) {
    // Map accidental to note name
    const noteMap = {
        '': 'C',      // Natural
        'bb': 'D',    // Double flat
        '#': 'B'      // Sharp
    };
    return noteMap[accidental] || 'C';
}

// Helper function: Get accidental display string
function getAccidentalDisplay(accidental) {
    const accidentalMap = {
        '': '',
        'bb': 'bb',
        '#': '#'
    };
    return accidentalMap[accidental] || '';
}

// Helper function: Generate three enharmonic spellings dynamically based on interval
// Finds the 3 closest enharmonic spellings within range for any interval
function generateEnharmonicKeysForPrecision(centsValue, precision) {
    // Normalize to octave (0-1200)
    let normalizedCents = centsValue % 1200;
    if (normalizedCents < 0) normalizedCents += 1200;
    
    // Pythagorean nominal pitches in cents from C
    const nominalsCents = {
        'C': 0,
        'D': 203.91,
        'E': 407.82,
        'F': 498.04,
        'G': 701.96,
        'A': 905.87,
        'B': 1109.78
    };
    
    // Accidental offsets in cents
    const accidentalOffsets = {
        '': 0,          // natural
        '#': 100,       // sharp (semitone)
        'x': 200,       // double sharp
        'b': -100,      // flat
        'bb': -200,     // double flat
        'bbb': -300,    // triple flat
    };
    
    // Precision-specific range threshold (in cents)
    const thresholds = {
        'medium': 5.4135717170339,    // apotome cents
        'high': 2.4188299161215,
        'ultra': 1.960,               // Herculean apotome
        'extreme': 0.488              // Olympian apotome
    };
    
    const rangeThreshold = thresholds[precision] * 2;  // Allow ±2 apotomes
    
    // Generate all possible note+accidental combinations
    const candidates = [];
    for (const [note, nominalCents] of Object.entries(nominalsCents)) {
        for (const [acc, accCents] of Object.entries(accidentalOffsets)) {
            const totalCents = nominalCents + accCents;
            const distance = Math.abs(normalizedCents - totalCents);
            
            // If within range, add to candidates
            if (distance <= rangeThreshold) {
                candidates.push({
                    noteName: note,
                    accidental: acc,
                    nominalCents: totalCents,
                    distance: distance,
                    fifthsCount: getFifthsCount(note, acc)
                });
            }
        }
    }
    
    // Sort by distance and take top 3
    candidates.sort((a, b) => a.distance - b.distance);
    const top3 = candidates.slice(0, 3);
    
    // If less than 3 candidates found, fall back to hardcoded set
    if (top3.length < 3) {
        return generateEnharmonicKeysForPrecisionFallback(precision);
    }
    
    // Convert to key format and lookup errors
    return top3.map(candidate => {
        const key = getFullKeyForNoteAccidental(candidate.noteName, candidate.accidental, precision);
        return {
            key: key,
            accidental: candidate.accidental,
            fifthsCount: candidate.fifthsCount,
            errorCents: calculateErrorForKey(key, precision),
            noteName: candidate.noteName
        };
    });
}

// Helper: Convert note+accidental to full key
function getFullKeyForNoteAccidental(noteName, accidental, precision) {
    // Boundary keys per precision for natural notes
    const boundaryKeys = {
        'medium': { 'C': 0, 'D': 44, 'E': 0, 'F': 0, 'G': 0, 'A': 0, 'B': -44 },
        'high': { 'C': 0, 'D': 52, 'E': 0, 'F': 0, 'G': 0, 'A': 0, 'B': -52 },
        'ultra': { 'C': 0, 'D': 48, 'E': 0, 'F': 0, 'G': 0, 'A': 0, 'B': -48 },
        'extreme': { 'C': 0, 'D': 48, 'E': 0, 'F': 0, 'G': 0, 'A': 0, 'B': -48 }
    };
    
    // Accidental offsets
    const accidentalKeyOffsets = {
        '': 0,
        '#': 1000,
        'x': 2000,
        'b': -1000,
        'bb': -2000,
        'bbb': -3000,
    };
    
    const boundaryKey = boundaryKeys[precision][noteName] || 0;
    const accOffset = accidentalKeyOffsets[accidental] || 0;
    return boundaryKey + accOffset;
}

// Helper: Get fifths count for enharmonic spelling
function getFifthsCount(noteName, accidental) {
    const fifthsBase = {
        'C': 0,
        'G': 1,
        'D': 2,
        'A': 3,
        'E': 4,
        'B': 5,
        'F': -1  // F# is 6 fifths up, F is 1 fifth down
    };
    
    const accidentalFifths = {
        '': 0,
        '#': 7,
        'x': 14,
        'b': -7,
        'bb': -14,
        'bbb': -21,
    };
    
    const baseFifths = fifthsBase[noteName] || 0;
    const accFifths = accidentalFifths[accidental] || 0;
    return baseFifths + accFifths;
}

// Fallback: Use hardcoded enharmonics if no candidates found
function generateEnharmonicKeysForPrecisionFallback(precision) {
    const enharmonicKeys = {
        medium: { 
            natural: { key: 0, accidental: '', fifthsCount: 0, noteName: 'C' },
            flat: { key: -1956, accidental: 'bb', fifthsCount: -14, noteName: 'D' },
            sharp: { key: 956, accidental: '#', fifthsCount: 12, noteName: 'B' }
        },
        high: { 
            natural: { key: 0, accidental: '', fifthsCount: 0, noteName: 'C' },
            flat: { key: -1948, accidental: 'bb', fifthsCount: -14, noteName: 'D' },
            sharp: { key: 948, accidental: '#', fifthsCount: 12, noteName: 'B' }
        },
        ultra: { 
            natural: { key: 0, accidental: '', fifthsCount: 0, noteName: 'C' },
            flat: { key: -1952, accidental: 'bb', fifthsCount: -14, noteName: 'D' },
            sharp: { key: 952, accidental: '#', fifthsCount: 12, noteName: 'B' }
        },
        extreme: { 
            natural: { key: 0, accidental: '', fifthsCount: 0, noteName: 'C' },
            flat: { key: -1952, accidental: 'bb', fifthsCount: -14, noteName: 'D' },
            sharp: { key: 952, accidental: '#', fifthsCount: 12, noteName: 'B' }
        }
    };
    
    const variants = enharmonicKeys[precision];
    
    return [
        { key: variants.natural.key, accidental: variants.natural.accidental, fifthsCount: variants.natural.fifthsCount, errorCents: calculateErrorForKey(variants.natural.key, precision), noteName: variants.natural.noteName },
        { key: variants.flat.key, accidental: variants.flat.accidental, fifthsCount: variants.flat.fifthsCount, errorCents: calculateErrorForKey(variants.flat.key, precision), noteName: variants.flat.noteName },
        { key: variants.sharp.key, accidental: variants.sharp.accidental, fifthsCount: variants.sharp.fifthsCount, errorCents: calculateErrorForKey(variants.sharp.key, precision), noteName: variants.sharp.noteName }
    ];
}

// Helper function to calculate error for a given key and precision level
function calculateErrorForKey(key, precision) {
    // Map of key values to error cents for each precision level
    // Uses full keys (including accidental offsets) from the spreadsheet
    const errorMap = {
        'medium': { 
            '0': 0, '44': 1.954, '-44': 1.954,           // Boundary keys
            '-1956': 1.954, '956': 1.954                 // Full keys with accidentals
        },
        'high': { 
            '0': 0, '52': 1.424, '-52': 1.424,           // Boundary keys
            '-1948': 1.424, '948': 1.424                 // Full keys with accidentals
        },
        'ultra': { 
            '0': 0, '48': 0, '-48': 0,                   // Boundary keys
            '-1952': 0, '952': 0                         // Full keys with accidentals
        },
        'extreme': { 
            '0': 0, '48': 0, '-48': 0,                   // Boundary keys
            '-1952': 0, '952': 0                         // Full keys with accidentals
        }
    };
    
    const keyStr = String(key);
    const precisionErrors = errorMap[precision] || {};
    return parseFloat(precisionErrors[keyStr] || 0);
}

export function updateSagittalOutputDisplays(columnIndex, centsValue, outputFrequency, ratioNum, ratioDen, absoluteMonzo) {
    // absoluteMonzo: the absolute pitch monzo [exp2, exp3, exp5, exp7, exp11, ...]
    // This encodes the full pitch (reference + interval), giving correct note names.
    // Primes in the app's monzo array: index 0=2, 1=3, 2=5, 3=7, 4=11, 5=13, 6=17, 7=19, 8=23...
    const APP_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];

    // Convert monzo array to the {prime: exponent} object the new Calculator expects.
    // Prime 2 is skipped – the Calculator uses MOD(1200*log2, 1200) which ignores octave.
    //
    // The app's absolute monzo is anchored so all-zero == A natural (see
    // constants.js: frequencyNote['A'] === 0, used for the "Defining 1/1" reference).
    // The Sagittal Calculator's NOMINALS table is anchored so all-zero == C natural
    // (fifthsFromC: 0). A sits 3 fifths above C, so the prime-3 exponent must be
    // shifted by +3 to realign the two coordinate systems before spelling the note.
    const exponents = {};
    if (absoluteMonzo && absoluteMonzo.length > 0) {
        for (let i = 1; i < APP_PRIMES.length; i++) {  // start at 1 to skip prime 2
            let exp = absoluteMonzo[i] || 0;
            if (APP_PRIMES[i] === 3) exp += 3;
            if (exp !== 0) exponents[APP_PRIMES[i]] = exp;
        }
    }

    // Read the unified Sagittal Output window controls
    const precision   = $("#sagittalTypeDropdown").val() || 'medium';
    const showEnh     = $("#sagittalShowEnharmonics").prop("checked");
    const octaveReduce = $("#sagittalNormalize").prop("checked");
    const useEvo      = $("#sagittalEvoToggle").hasClass("selected");
    const useUnicode  = $("#sagittalUnicodeToggle").hasClass("selected");

    // Call the 1:1 Excel conversion Calculator
    const variants = getEnharmonicVariants(
        { exponents, numerator: 1, denominator: 1, nominal: 'C' },
        precision
    ).filter(v => v.nominalLetter);

    // When "enh equivalent" is off, show only the most accurate spelling —
    // smallest absolute error, compared at full floating-point resolution.
    let shown = variants;
    if (!showEnh && variants.length > 1) {
        shown = [variants.reduce((a, b) => {
            const ea = (typeof a.error === 'number') ? Math.abs(a.error) : Infinity;
            const eb = (typeof b.error === 'number') ? Math.abs(b.error) : Infinity;
            return eb < ea ? b : a;
        })];
    }

    const symbolField = (useEvo ? 'evo' : 'revo') + '_' + (useUnicode ? 'unicode' : 'ascii');
    const symbolClass = useUnicode ? 'sagittal-symbol-unicode' : 'sagittal-symbol-ascii';

    // Every column renders the same number of variant slots (3 in enh mode, 1 otherwise),
    // padding with empty placeholders so rows below stay horizontally aligned.
    const slotCount = showEnh ? 3 : 1;

    const rowsHtml = shown.map(variant => {
        const letter = variant.nominalLetter || '';
        const symbol = variant[symbolField] || '';
        return `
            <div class="sagittal-notation-display">
                <span class="sagittal-letter">${letter}</span><!--
                --><span class="${symbolClass}">${symbol}</span>
            </div>
        `;
    }).join('');

    const placeholderHtml = `
        <div class="sagittal-notation-display"></div>
    `.repeat(Math.max(0, slotCount - shown.length));

    $(`#sagittalVariants_${columnIndex}`).html(rowsHtml + placeholderHtml);

    // Error(¢) lines live in the values region (with Hz), one per shown variant.
    // Signed like the EDO cent-deviation display: positive means the true pitch is
    // sharp of the notated Sagittal symbol, negative means it's flat.
    // Rounded to the app-wide "Display" precision setting (0-6 decimal places).
    const errorsHtml = shown.map(variant => {
        const errorNum = (typeof variant.error === 'number') ? variant.error : 0;
        let error      = errorNum.toFixed(state.precision);
        if (parseFloat(error) === 0) error = (0).toFixed(state.precision); // avoid "-0"
        return `<div class="output-content sagittal-error-value">${error}</div>`;
    }).join('');
    $(`#sagittalError_${columnIndex}`).html(errorsHtml);

    // The notated Sagittal symbol deviates from the exact JI input by the
    // error shown above (error = true JI pitch - notated pitch). The Hz and
    // cents readouts (and playback) sound the notated symbol, not the raw JI
    // ratio, so subtract that error. With multiple enharmonic variants shown,
    // the most accurate spelling (smallest absolute error) is used.
    const bestVariant = shown.length ? shown.reduce((a, b) => {
        const ea = (typeof a.error === 'number') ? Math.abs(a.error) : Infinity;
        const eb = (typeof b.error === 'number') ? Math.abs(b.error) : Infinity;
        return eb < ea ? b : a;
    }) : null;
    const notationError = (bestVariant && typeof bestVariant.error === 'number') ? bestVariant.error : 0;

    // Frequency: the notated Sagittal pitch; octave reduce folds the
    // ratio into [1, 2) above the 1/1 (mirroring the HEJI Output normalize).
    let frequency = outputFrequency;
    if (octaveReduce && ratioNum > 0 && ratioDen > 0) {
        const r = ratioNum / ratioDen;
        frequency = state.freq1to1 * r * Math.pow(2, -Math.floor(Math.log2(r)));
    }
    if (frequency !== undefined && !isNaN(frequency)) {
        frequency = frequency * Math.pow(2, -notationError / 1200);
    }
    state.sagittalOutputFrequencies[columnIndex] = frequency;
    $(`#sagittalFrequency_${columnIndex}`).text(
        (frequency !== undefined && !isNaN(frequency)) ? frequency.toFixed(state.precision) + "Hz" : ""
    );

    // Cents from the 1/1 reference (like #JIgross / #edoJIgross beneath Hz in
    // the HEJI and EDO windows), folded when this window's octave reduce is on
    // so it always agrees with the frequency line above. The notation error is
    // subtracted after folding so both lines describe the same sounding pitch.
    if (ratioNum > 0 && ratioDen > 0) {
        let centsToRef = 1200 * Math.log2(ratioNum / ratioDen);
        if (octaveReduce) {
            centsToRef = ((centsToRef % 1200) + 1200) % 1200;
        }
        centsToRef = centsToRef - notationError;
        const sign = centsToRef > 0 ? "+" : "";
        $(`#sagittalJIgross_${columnIndex}`).text(sign + centsToRef.toFixed(state.precision) + "c");
    } else {
        $(`#sagittalJIgross_${columnIndex}`).text("");
    }
}

export function generateEdoOutputColumns(numColumns) {
    let edoOutputContainer = $(".edo-output-container");
    edoOutputContainer.empty(); // Clear existing columns

    for (let i = 1; i <= numColumns; i++) {
        let columnHtml = `
            <div class="output-column">
                <div class="notation-display-container edo-notation-display-container">
                    <div class="edoNoteName" id="edoNoteName_${i}"></div><!--
                    --><div class="edoNotationOutput" id="edoNotationOutput_${i}"></div>
                </div>
                <div class="output-region-ratio">
                    <div id="edoStepDistance_${i}"></div>
                </div>
                <div class="output-region-values">
                    <div class="output-content">
                        <span id="edoCentDeviation_${i}" value="0"></span>
                    </div>
                    <div class="output-content">
                        <div type="text" id="edoFrequency_${i}" value="440"></div>
                    </div>
                    <div class="output-content">
                        <div id="edoJIgross_${i}" value="0">0</div>
                    </div>
                </div>
            </div>
        `;
        edoOutputContainer.append(columnHtml);
    }
}

// Update EDO notation for a specific column
export function updateEdoNotationDisplay(columnIndex, jiCents, edoQuantisation, octaveReduce, ref12, centsToRef) {
    // Calculate EDO step and notation
    const edoStepSize = 1200 / edoQuantisation;
    let edoStep = Math.round(jiCents / edoStepSize);
    let centDeviation = (edoStep * edoStepSize) - jiCents;

    if (octaveReduce) {
        edoStep = U.mod(edoStep, edoQuantisation);
        centDeviation = (edoStep * edoStepSize) - jiCents; // Re-calculate deviation after octave reduction
        // Adjust centDeviation for +/- 50c display
        if (centDeviation > 600) {
            centDeviation -= 1200;
        } else if (centDeviation < -600) {
            centDeviation += 1200;
        }
    }

    const hejiBaseNote = $(`#noteName_${columnIndex}`).text(); // Retrieve HEJI base note
    const refpc = parseInt(getRefNote());
    const ref12acc = state.ref12acc;
    const edoNotation = calculateEdoNotation(edoStep, edoQuantisation, refpc, ref12acc, getShowEnharmonics(), hejiBaseNote, getExcludeHalves());

    // "enh equivalent" can yield comma-separated enharmonic spellings (e.g.
    // "C, Db"). Split them; a single spelling keeps the note-name/accidental
    // split, multiple spellings stack vertically (no comma), like the Tuner.
    // Reversed so the spelling that was on top is now on the bottom.
    const edoSpellings = edoNotation.split(',').map((s) => s.trim()).filter(Boolean).reverse();
    const edoStacked = edoSpellings.length > 1;
    // With the stack's tightened line-height (0.8), font-size = 4rem/(0.8*count)
    // keeps the stacked line-boxes summing to 4rem (a single note's height) while
    // the glyphs themselves grow to fill that height.
    const edoStackFontRem = 4 / (0.8 * Math.max(1, edoSpellings.length));
    let baseNoteName = '';
    let accidentalSymbols = '';
    if (!edoStacked) {
        const single = edoSpellings[0] || edoNotation;
        baseNoteName = single.split(/[\^vb#x\\/]/)[0].trim();
        accidentalSymbols = single.substring(baseNoteName.length).trim();
    }
    
    // Format cent deviation
    let centsText;
    if (Math.round(centDeviation * 1e9) / 1e9 === 0) { // Check for near-zero
        centsText = "0"; // Display "0" instead of hiding it
    } else if (centDeviation > 0) {
        centsText = "+" + centDeviation.toFixed(state.precision);
    } else {
        centsText = centDeviation.toFixed(state.precision);
    }

    if (edoStacked) {
        // Inline font-size so it beats the app-wide `* { font-size: 11.2px }`
        // rule (which otherwise clobbers these child divs' inherited size).
        const stackHtml = `<div class="edo-enh-stack">`
            + edoSpellings.map((sp) =>
                `<div class="edo-enh-spelling" style="font-size:${edoStackFontRem}rem">${sp}</div>`).join('')
            + `</div>`;
        $(`#edoNoteName_${columnIndex}`).html(stackHtml);
        $(`#edoNotationOutput_${columnIndex}`).text('');
    } else {
        $(`#edoNoteName_${columnIndex}`).text(baseNoteName);
        $(`#edoNotationOutput_${columnIndex}`).text(accidentalSymbols);
    }

    // Populate EDO Step Distance
    $(`#edoStepDistance_${columnIndex}`).text(edoStep);
    $(`#edoStepDistance_${columnIndex}`).css({
        'font-family': 'monospace',
        'font-size': '2.0rem',
        'text-align': 'center'
    });

    $(`#edoCentDeviation_${columnIndex}`).text(centsText);

    // Apply monospace font and specified sizes to EDO output
    $(`#edoNoteName_${columnIndex}`).css({
        'font-family': '"EdoAccidentals"', // Re-add font-family override, now with EdoAccidentals
        'font-size': (edoStacked ? edoStackFontRem : 4) + 'rem' // stacked spellings shrink to fit
    });
    $(`#edoNotationOutput_${columnIndex}`).css({
        'font-family': '"EdoAccidentals"', // Re-add font-family override, now with EdoAccidentals
        'font-size': '4rem' // Matching main output font size
    });
    // Ensure no wrapping for EDO notation display
    $(`.edo-notation-display-container`).css('white-space', 'nowrap');

    // Calculate and store EDO frequency
    const edoFrequency = state.freq1to1 * Math.pow(2, edoStep / edoQuantisation);
    state.edoOutputFrequencies[columnIndex] = edoFrequency;
    $(`#edoFrequency_${columnIndex}`).text(edoFrequency.toFixed(state.precision) + "Hz");

    // Populate cents from reference
    if (centsToRef > 0) {
        $(`#edoJIgross_${columnIndex}`).text("+" + centsToRef.toFixed(state.precision) + "c");
    } else {
        $(`#edoJIgross_${columnIndex}`).text(centsToRef.toFixed(state.precision) + "c");
    }
}
