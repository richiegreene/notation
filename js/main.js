
import * as C from './calc/constants.js';
import * as U from './calc/utils.js';
import { state } from './calc/state.js';
import * as Calc from './calc/calculator.js';
import * as UI from './calc/ui.js';

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

window.clearAllIntervals = function() {
    // Reset Interval Entry fields
    $("#stacking-input").val(1);
    $("#stacking-input").trigger("change"); // This will call generateStackingRatioFields(1) and doCalc()

    // Reset HEJI Entry fields and trigger calculations
    sendA();
}

window.sendA = function() {
	$("#intervalInput").click(); // Trigger Interval Entry as default
	$(".notes[value='1']").click();
	$("#defaultOctave").click();
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

$(document).ready(function(){
	state.kammerTon = $("#frequencyA4").val();
	sendA();
	UI.getPC();
	$("#octaveDropdown").change(function(c){
		// No need to manage 'selected' class for dropdowns
		Calc.getFrequency1to1();
		Calc.doCalc();
		UI.getPC();
	});
	$("#diatonicNoteDropdown").change(function(c){
		// No need to manage 'selected' class for dropdowns
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
	$("#paletteInput").click(function(c){
		Calc.doCalc();
		UI.getPC();
	});
	$("#intervalInput").click(function(c){
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

        // Ensure headerToClick and toggleIconSpan are found before proceeding
        if (!headerToClick || !toggleIconSpan) {
            console.error("Could not find header or toggle icon for item:", item);
            return; // Skip this item if elements are missing
        }

        // Ensure all sections are expanded by default
        headerToClick.classList.remove('collapsed');
        content.style.display = 'grid';
        toggleIconSpan.textContent = '▼';
        item.classList.remove('collapsed-item'); // Make sure it's not collapsed initially

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
        handle: '.settings-header, .toggle-header-placement', // Only drag by the header
        ghostClass: 'sortable-ghost' // Class name for the drop placeholder
    });

    // Prevent clicks on radio buttons and their labels from collapsing/expanding the section
    $('.toggle-header-placement input[type="radio"]').on('click', function(event) {
        event.stopPropagation();
    });

    $('.toggle-header-placement label').on('click', function(event) {
        event.stopPropagation();
    });

    $("#output-columns-input").change(function(c){
        let numColumns = $(this).val();
        UI.generateOutputColumns(numColumns);
        Calc.doCalc();
    });

    $("#stacking-input").change(function() {
        let numStackingFields = $(this).val();
        UI.generateStackingRatioFields(numStackingFields);
        Calc.doCalc(); // Recalculate after generating new fields
    });

    UI.generateOutputColumns($("#output-columns-input").val());
    UI.generateStackingRatioFields(1); // Initial call with 1 field
    clearRatio1(); // Ensure savedNum and savedDen are internally 1/1
    $("#stacking-input").trigger("change"); // Trigger change event to reflect initial state

    // Add a copy event listener to the output-content div to handle ratio copy
    $('.output-content').on('copy', function(event) {
        const selection = window.getSelection();
        const numValue = $('#num').text();
        const denValue = $('#den').text();
        const combinedValue = numValue + '/' + denValue;

        // Check if the selection includes content from #num and #den
        if (selection.toString().includes(numValue) && selection.toString().includes(denValue)) {
            event.preventDefault(); // Prevent default copy behavior
            const clipboardData = event.originalEvent.clipboardData || window.clipboardData;
            clipboardData.setData('text/plain', combinedValue);
        }
    });

    // Event listener for dynamically generated ratio input fields
    $("#dynamic-ratio-fields-container").on("change", "input.ratioIn", function() {
        Calc.doCalc();
    });
});
