"use strict";

// create new game object if none exists
var game = game || {};

game.main = {
	/* PROPERTIES */
	WIDTH : 1260,			// canvas width
    HEIGHT: 720,			// canvas height
    canvas: null,			// canvas reference
    ctx: null,				// canvas 2D context reference
	engine: undefined,		// engine module
	
	audioElement: null,		// audio player reference
	songSource: null,		// current song source
	
	mouse: null,			// mouse position vector
	
   	prevTime: 0,			// time of previous frame
    debug: true,			// debug mode toggle
	
	paused: false,			// whether or not the game is paused
	
	/* METHODS */
	// initialize game
	init: function() {
		if (this.debug) console.log("Initializing game...");
		// initialize canvas
		this.canvas = document.querySelector('canvas');
		this.canvas.width = this.WIDTH;
		this.canvas.height = this.HEIGHT;
		this.ctx = this.canvas.getContext('2d');
		
		// initialize music
		this.audioElement = document.querySelector('audio');
		this.playStream(this.audioElement);
		
		// initialize mouse
		this.canvas.onmousemove = function(e) {
			this.mouse = getMouse(e);
		}
	},
	
	// PAUSE FUNCTION: pauses the game
	pauseGame: function() {
		this.engine.pauseGame();
	},
	
	// RESUME FUNCTION: resumes the game
	resumeGame: function() {
		this.engine.resumeGame();
	},
	
	// change song
	playStream: function(audioElement){
		audioElement.src = this.songSource;
		audioElement.play();
		audioElement.volume = 0.2;
	},
	
	// calculate delta time
	calcDeltaTime: function(){
		var now, fps;
		now = (+new Date); 
		fps = 1000 / (now - this.prevTime);
		this.prevTime = now; 
		return 1/fps;
	}
};