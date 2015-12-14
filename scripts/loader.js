"use strict";

// create new game object if none exists
var game = game || {};


window.onload = function(){
	console.log("Loading game...");
	game.windowManager.init();
	game.engine.init();
};

window.onblur = function() {
	game.engine.pauseGame();
};