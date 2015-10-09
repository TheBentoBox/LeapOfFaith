"use strict";

// create new game object if none exists
var game = game || {};


window.onload = function(){
	console.log("Loading game...");
	game.engine.init();
	game.main.engine = game.engine;
	game.main.init();
};

window.onblur = function() {
	game.main.pauseGame();
};

window.onfocus = function() {
	game.main.resumeGame();
};

// callback for button presses
window.addEventListener("keydown", game.main.keyPress);