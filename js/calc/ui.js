
import * as C from './constants.js';
import * as U from './utils.js';
import { state } from './state.js';

// Functions to retrieve input values 
export function getRefOctave(){
	return $("#octaveDropdown").val();
}

export function getRefNote(){
	return $("#diatonicNoteDropdown").val();
}

export function getRefAccidental(){
	return $("#refAccidentalDropdown").val();
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
            ratioHtml += `<div class="times-symbol">×</div>`;
        }
        ratioHtml += `
            <div class="interval-column">
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
                <div class="output-content">
                    <div class="ratio-display-container">
                        <div id="num_${i}" class="num" value="1"></div>
                        <div id="den_${i}" class="den" value="1"></div>
                        <span id="ratioCopyHelper_${i}" style="position: absolute; left: -9999px;"></span>
                    </div>
                </div>
                <div class="output-content">
                    <span id="midiNote_${i}"></span><span id="midiAccidental_${i}" class="midiAccidental"></span>
                    <span id="cents_${i}" value="0"></span>
                </div>
                <div class="output-content">
                    <div type="text" id="frequency_${i}" value="440"></div>
                </div>
                <div class="output-content">
                    <div id="JIgross_${i}" value="0">0</div>
                </div>
            </div>
        `;
        outputContainer.append(columnHtml);
    }
}

// get HE notation output 
export function getPC(columnIndex){
	var inverseSum = U.diffArray(state.displaySum, C.refOctave[getRefOctave()]);
    inverseSum = U.diffArray(inverseSum, C.refNote[getRefNote()]);
    inverseSum = U.diffArray(inverseSum, C.refAccidental[getRefAccidental()]);

	var referenceSum = U.diffArray(C.refOctave[getRefOctave()], C.refNote[getRefNote()]);
    referenceSum = U.diffArray(referenceSum, C.refAccidental[getRefAccidental()]);

	var refArray = U.productArray(referenceSum, C.tonalIdentity);

    let tonalArray;
	if ($("#paletteInput").prop("checked")){
		tonalArray = U.productArray(state.displaySum, C.tonalIdentity);
	} else if ($("#intervalInput").prop("checked") || $("#chordInput").prop("checked")){
		tonalArray = U.productArray(inverseSum, C.tonalIdentity);
	}
	var refArraySum = U.sum(refArray);
	var tonalArraySum = U.sum(tonalArray);
	var refpc = U.mod((refArraySum + 4),7); 
	var pc = U.mod((tonalArraySum + 4),7);
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
	$("#refflat").click(function(c){ 
		state.ref12acc = 1; 
	})
	$("#refsharp").click(function(c){ 
		state.ref12acc = -1; 
	})
	$("#defaultRefAccidental").click(function(c){ 
		state.ref12acc = 0; 
	})
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
	var chromatic = tonalArraySum + 25;
	// display natural on diatonic pitch classes 
	if ((state.displaySum[1] - refNat + refpc - 4 == -4 || state.displaySum[1] - refNat + refpc - 4 == -3 || state.displaySum[1] - refNat + refpc - 4 == -2 || state.displaySum[1] - refNat + refpc - 4 == -1 || state.displaySum[1] - refNat + refpc - 4 == 0 || state.displaySum[1] - refNat + refpc - 4 == 1 || state.displaySum[1] - refNat + refpc - 4 == 2) && state.displaySum[2] == 0 && state.displaySum[3] == 0 && state.displaySum[4] == 0 && state.displaySum[5] == 0 && state.displaySum[6] == 0 && state.displaySum[7] == 0 && state.displaySum[8] == 0 && state.displaySum[9] == 0 && state.displaySum[10] == 0 && state.displaySum[11] == 0 && state.displaySum[12] == 0 && state.displaySum[13] == 0 && state.displaySum[14] == 0 && state.displaySum[15] == 0 && state.displaySum[16] == 0 && state.displaySum[17] == 0 && state.displaySum[18] == 0 && state.displaySum[19] == 0 && state.displaySum[20] == 0 && state.displaySum[21] == 0 && state.displaySum[22] == 0 && state.displaySum[23] == 0){
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

	// Conditional alignment logic based on user feedback
	const isHejiExtOnly = (heji2String.trim().length === 0 || heji2String.trim() === 'n') && hejiExtensionsPath.trim().length > 0;

	if (isHejiExtOnly) {
		// State: HEJI Extensions only
		$('.noteName').css('top', '1rem');
		$('.notation-display-container').css('padding-bottom', '2rem');
	} else {
		// Default state: HEJI2 only, or both together
		$('.noteName').css('top', '0rem');
		$('.notation-display-container').css('padding-bottom', '0rem');
	}

	// Reset other offsets to ensure clean state
	$('.heji2').css('top', '0rem');

	var notationString;
	var undefinedNotation;
	// Check if HEJI notation is uncalculatable
	if (($("#intervalInput").prop("checked") || $("#chordInput").prop("checked")) && (
		state.hasPrimeGreaterThan89 || // If prime > 89 is present
		(heji2String.trim().length === 0 && hejiExtensionsPath.trim().length === 0 && natural.trim().length === 0) // Or if no HEJI symbols are found
	)) {
		notationString = "<span style='font-family: monospace;'>n/a</span>"; // Apply monospace font
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

    // New logic for padding:
    const noteNameElement = $("#noteName_" + columnIndex);
    if (hejiExtensionsPath.trim().length === 0 && displayedHeji2String.trim().length === 0) {
        // If only letter name is displayed, add padding
        noteNameElement.css({
            'padding-top': '50px', // Test value for 2/3rds upper padding multiplied by 5
            'padding-bottom': '50px' // Test value for 2/3rds lower padding multiplied by 5
        });
    } else {
        // Reset padding if not solo letter name (important for dynamic updates)
        noteNameElement.css({
            'padding-top': '0',
            'padding-bottom': '0'
        });
    }
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
            ratioHtml += `<div class="times-symbol">+</div>`;
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
