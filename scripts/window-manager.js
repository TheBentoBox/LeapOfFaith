// window-manager.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.windowManager = (function(){
	console.log("Loaded window-manager.js module");
	
	var canvas = game.engine.canvas;	// reference to game's canvas
	
	var uiElements = [];			// UI elements on the screen
	
	canvas.onclick = checkMouse;	// click event to check mouse on UI
	canvas.touchstart = checkMouse;	// tap event to check touch on UI
	
	// FUNCTION: update and draw window
	function updateAndDraw(trackers){
		for(var i=0; i < uiElements.length; i++){
			uiElements[i].updateAndDraw(trackers);
		}
	}
	
	// FUNCTION: check clicks on UI
	function checkMouse(e){
		var mouse = getMouse(e);	// mouse position
		var elem;					// UI element
		var but;					// button
		// check if any UI elements were clicked
		for(var i=0; i < uiElements.length; i++){
			elem = uiElements[i];
			if(mouse.x >= elem.position.x && mouse.x <= elem.position.x + elem.size.x && mouse.y >= elem.position.y && mouse.y <= elem.position.y + elem.size.y){
				// check if any buttons were clicked inside the clicked element
				for(var j=0; j < uiElements[i].buttons.length; j++){
					but = elem.buttons[j];
					if(mouse.x >= elem.position.x + but.offset.x && mouse.x <= elem.position.x + but.offset.x + but.size.x && mouse.y >= elem.position.y + but.offset.y && mouse.y <= elem.position.y + but.offset.y + but.size.y){
						// call click event of clicked button
						but.onClick();
						return;
					}
				}
			}
		}
		// TODO: send mouse event down to engine
	}
	
	return {
		updateAndDraw: updateAndDraw,
	}
}());