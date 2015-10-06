"use strict";

// create new game object if none exists
var game = game || {};


window.onload = function(){
	console.log("Loading game...");
	game.engine.init();
	game.main.engine = game.engine;
	game.main.init();
}

window.onblur = function() {
	game.main.paused = true;
	
	// stop the animation loop
	cancelAnimationFrame(game.main.animationID);
	cancelAnimationFrame(game.main.engine.animationID);
	
	// call update() once so the draw screen gets drawn
	game.main.update();
};

window.onfocus = function() {
	console.log("focus at " + Date());
	
	// stop the animation loop, just in case it's running
	cancelAnimationFrame(game.main.animationID);
	cancelAnimationFrame(game.main.engine.animationID);
	
	game.main.paused = false;
	
	// restart the loop
	game.main.update();
}

// callback for button presses
window.addEventListener("keydown", game.main.keyPress);