import * as C from './calc/constants.js';
import * as U from './calc/utils.js';
import { state } from './calc/state.js';
import * as Calc from './calc/calculator.js';
import * as UI from './calc/ui.js';
import { initAudio, updateWaveform, playFrequencies, stopAllFrequencies } from './audio-playback.js'; // Import audio functions

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
        Calc.doCalc();
    }
}

window.clearRatio = function(index) {
    $(`#inputNum_${index}`).val(1);
    $(`#inputDen_${index}`).val(1);
    Calc.doCalc();
}

window.clearRatio1 = function() {
	state.savedNum = 1;
	state.savedDen = 1;
	state.savedInputSum = C.reference;
	$("#savedNum").val(state.savedNum);
	$("#savedDen").val(state.savedDen);
	Calc.getSavedInputSum();
}

window.getCurrentPitch = function() {
	window.loadCurrentPitch(); // Call loadCurrentPitch without an index for the static saved ratio
}

window.loadCurrentPitchToChord = function(index) {
    $(`#chordInputNum_${index}`).val(state.displayNumValue);
    $(`#chordInputDen_${index}`).val(state.displayDenValue);
    Calc.doCalc();
}

window.clearChordRatio = function(index) {
    $(`#chordInputNum_${index}`).val(1);
    $(`#chordInputDen_${index}`).val(1);
    Calc.doCalc();
}

window.clearAllIntervals = function() {
    // Reset Interval Entry fields
    $("#stacking-input").val(1);
    $("#stacking-input").trigger("change"); 

    // Reset Chord Entry fields
    $("#chord-size-input").val(1);
    $("#chord-size-input").trigger("change");

    // Reset HEJI Entry fields and trigger calculations
    sendA();
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
	Calc.doCalc();
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

$(document).ready(function(){
    applyStoredTheme(); // Apply theme on load

    // Theme toggle functionality
    $("#theme-toggle").on("click", function() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });

	state.kammerTon = $("#frequencyA4").val();
	state.precision = $("#precision").val();
	sendA();
	UI.getPC();

    initAudio(); // Initialize the audio context
    updateWaveform(parseFloat($("#timbreSlider").val())); // Set initial waveform

	$("#octaveDropdown").change(function(c){
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});
	$("#diatonicNoteDropdown").change(function(c){
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});
	$("#refAccidentalDropdown").change(function(c){
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});
	$("#hejiOctaveDropdown").change(function(c){
		Calc.doCalc();
		UI.getPC();
	});
	$("#hejiDiatonicNoteDropdown").change(function(c){
		Calc.doCalc();
		UI.getPC();
	});
	$(".refOctave").click(function(c){
		$(".refOctave").removeClass("selected");
		$(this).addClass("selected");
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});
	$(".refNote").click(function(c){
		$(".refNote").removeClass("selected");
		$(this).addClass("selected");
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});


	$(".accidental").click(function(c){
		$(".accidental").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	});

	$(".chromatic").click(function(c){
		$(".chromatic").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	});
	$(".syntonic").click(function(c){
		$(".syntonic").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".septimal").click(function(c){
		$(".septimal").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".undecimal").click(function(c){
		$(".undecimal").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".tridecimal").click(function(c){
		$(".tridecimal").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".seventeen").click(function(c){
		$(".seventeen").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".nineteen").click(function(c){
		$(".nineteen").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".twentyThree").click(function(c){
		$(".twentyThree").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".twentyNine").click(function(c){
		$(".twentyNine").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".thirtyOne").click(function(c){
		$(".thirtyOne").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".thirtySeven").click(function(c){
		$(".thirtySeven").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".fortyOne").click(function(c){
		$(".fortyOne").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".fortyThree").click(function(c){
		$(".fortyThree").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".fortySeven").click(function(c){
		$(".fortySeven").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".fiftyThree").click(function(c){
		$(".fiftyThree").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".fiftyNine").click(function(c){
		$(".fiftyNine").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".sixtyOne").click(function(c){
		$(".sixtyOne").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".sixtySeven").click(function(c){
		$(".sixtySeven").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".seventyOne").click(function(c){
		$(".seventyOne").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".seventyThree").click(function(c){
		$(".seventyThree").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".seventyNine").click(function(c){
		$(".seventyNine").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".eightyThree").click(function(c){
		$(".eightyThree").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
		UI.getPC();
	}); 
	$(".eightyNine").click(function(c){
		$(".eightyNine").removeClass("selected");
		$(this).addClass("selected");
		Calc.doCalc();
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
	$("#paletteInput").click(function(c){
		Calc.doCalc();
		UI.getPC();
	});
	$("#intervalInput").click(function(c){
		Calc.doCalc();
		UI.getPC();
	});
    $("#chordInput").click(function(c){
        Calc.doCalc();
        UI.getPC();
    });


	$("#normalize").click(function(c){
		Calc.doCalc();
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
		Calc.doCalc();
    });
    
	$("#sibeliusRange").change(function(c){
		state.sibeliusRange = $(this).val();
		UI.getBend();
    });
	$("#midiRange").change(function(c){
		state.midiRange = $(this).val();
		UI.getBend();
    });

    // Collapsible menu functionality
    document.querySelectorAll('.settings-menu-item').forEach(item => {
        let headerToClick = item.querySelector('.toggle-header-placement') || item.querySelector('.settings-header');
        let toggleIconSpan = item.querySelector('.toggle-icon');

        const content = item.querySelector('.settings-content');

        if (!headerToClick || !toggleIconSpan) {
            return; 
        }

        headerToClick.classList.remove('collapsed');
        content.style.display = 'grid';
        toggleIconSpan.textContent = '▼';
        item.classList.remove('collapsed-item');

        headerToClick.addEventListener('click', () => {
            const isCollapsed = headerToClick.classList.toggle('collapsed');
            if (isCollapsed) {
                content.style.display = 'none';
                toggleIconSpan.textContent = '';
                item.classList.add('collapsed-item');
            } else {
                content.style.display = 'grid';
                toggleIconSpan.textContent = '▼';
                item.classList.remove('collapsed-item');
            }
        });
    });

    // Initialize SortableJS for drag-and-drop
    var el = document.querySelector('.calc-container');
    var sortable = Sortable.create(el, {
        animation: 150,
        handle: '.settings-header, .toggle-header-placement',
        ghostClass: 'sortable-ghost'
    });

    // Prevent clicks on radio buttons and their labels from collapsing/expanding the section
    $('.toggle-header-placement input[type="radio"]').on('click', function(event) {
        event.stopPropagation();
    });

    $('.toggle-header-placement label').on('click', function(event) {
        event.stopPropagation();
    });

    $("#chord-size-input").change(function() {
        let numFields = $(this).val();
        UI.generateOutputColumns(numFields);
        UI.generateChordRatioFields(numFields);
        Calc.doCalc();
    });

    $("#stacking-input").change(function() {
        let numStackingFields = $(this).val();
        UI.generateStackingRatioFields(numStackingFields);
        Calc.doCalc();
    });

    // Initial setup
    $("#chord-size-input").trigger("change");
    $("#stacking-input").trigger("change");
    clearRatio1();

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

    function calculateEnumeratedChord() {
        const input = $("#enumerated-chord-input").val();
        const parts = input.split(':').map(s => s.trim()).filter(s => s.length > 0 && !isNaN(s));

        const baseNum = parseInt($("#enumerated-base-num").val(), 10) || 1;
        const baseDen = parseInt($("#enumerated-base-den").val(), 10) || 1;

        if (parts.length > 0) {
            const denominator = parseInt(parts[0], 10);
            if (denominator === 0) return; // Avoid division by zero

            const chordSize = parts.length;
            
            // Update chord size and generate fields
            $("#chord-size-input").val(chordSize).trigger('change');

            parts.forEach((part, index) => {
                const numerator = parseInt(part, 10);
                
                // Multiply by the base ratio
                const finalNum = numerator * baseNum;
                const finalDen = denominator * baseDen;

                const reduced = U.reduce(finalNum, finalDen);
                
                const fieldIndex = index + 1; // Use 1-based index for fields
                
                $(`#chordInputNum_${fieldIndex}`).val(reduced[0]);
                $(`#chordInputDen_${fieldIndex}`).val(reduced[1]);
            });

            Calc.doCalc();
        } else {
            // If the enumerated chord input is empty, clear the outputs
            $("#chord-size-input").val(1).trigger('change');
            $(`#chordInputNum_1`).val(baseNum);
            $(`#chordInputDen_1`).val(baseDen);
            Calc.doCalc();
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

    // Event listener for dynamically generated ratio input fields
    $("#dynamic-ratio-fields-container, #chord-ratio-fields-container").on("change", "input.ratioIn", function() {
        Calc.doCalc();
    });

    // Timbre slider event listener
    $("#timbreSlider").on("input", function() {
        updateWaveform(parseFloat($(this).val()));
    });

    // Play button event listener
    $("#playOutputButton").on("click", function() {
                    if (isPlaying) {
                        stopAllFrequencies(0.2); // Fade out over 0.2 seconds
                        isPlaying = false;
                        $(this).text("play").removeClass("playing-active");
                    } else {
                        const chordSize = parseInt($("#chord-size-input").val());
                        const frequencies = [];
                        for (let i = 1; i <= chordSize; i++) {
                            const freqValue = state.outputFrequencies[i]; // Get unrounded frequency directly from state
                            if (freqValue !== undefined && !isNaN(freqValue)) {
                                frequencies.push(freqValue);
                            }
                        }
                        if (frequencies.length > 0) {
                            playFrequencies(frequencies, 0.2); // Fade in over 0.2 seconds
                            isPlaying = true;
                            $(this).text("stop").addClass("playing-active");
                        } else {
                            console.warn("No frequencies to play.");
                        }
                    }    });

    // Stop playback if chord size changes or any input changes that trigger doCalc
    // This needs to be carefully managed to avoid stopping on every single UI update.
    // A more robust solution might involve a dedicated "stop" when relevant inputs change.
    // For now, let's stop playback whenever Calc.doCalc is invoked.
    const originalDoCalc = Calc.doCalc;
    Calc.doCalc = function() {
        originalDoCalc();
        if (isPlaying) {
            stopAllFrequencies(0.1); // Quick fade out
            isPlaying = false;
            $("#playOutputButton").text("play").removeClass("playing-active");
        }
    };
});