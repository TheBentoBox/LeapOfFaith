"use strict";

// create new game object if none exists
var game = game || {};


window.onload = function(){
	console.log("Loading game...");
	game.main.init();
}

window.onblur = function() {
	game.main.paused = true;
	
	// stop the animation loop
	cancelAnimationFrame(game.main.animationID);
	
	// call update() once so the draw screen gets drawn
	game.main.update();
};

window.onfocus = function() {
	console.log("focus at " + Date());
	
	// stop the animation loop, just in case it's running
	cancelAnimationFrame(game.main.animationID);
	
	game.main.paused = false;
	
	// restart the loop
	game.main.update();
}

// callback for button presses
window.addEventListener("keydown", game.main.keyPress);