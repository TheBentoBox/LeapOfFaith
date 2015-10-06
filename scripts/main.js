"use strict";

// create new game object if none exists
var game = game || {};

game.main = {
	/* PROPERTIES */
	WIDTH : 1260,			// canvas width
    HEIGHT: 720,			// canvas height
    canvas: null,			// canvas reference
    ctx: null,				// canvas 2D context reference
	engine: undefined,
	
	audioElement: null,		// audio player reference
	songSource: null,		// current song source
	
	mouse: null,			// mouse position vector
	
   	prevTime: 0,			// time of previous frame
    debug: true,			// debug mode toggle
	
	paused: false,			// whether or not the game is paused
	animationID: 0,			// controls drawing state (for pausing, etc.)
	
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
		this.canvas.onmousemove = function(e){
			this.mouse = getMouse(e);
		}
		
		// start the game loop
		this.update();
	},
	
	// game loop
	update: function(){
		// schedule next call to update
	 	this.animationID = requestAnimationFrame(this.update.bind(this));
		
		// check if the game is paused first
		if (this.paused) {
			this.drawPauseScreen(this.ctx);
			return;
		}
	 	
	 	// get delta time
	 	var dt = this.calcDeltaTime();
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
	},
	
	// HELPER FUNCTION: fill text
	// fills a text with correct CSS and cleans up after itself
	fillText: function(string, x, y, css, color) {
		this.ctx.save();
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font
		this.ctx.font = css;
		this.ctx.fillStyle = color;
		this.ctx.fillText(string, x, y);
		this.ctx.restore();
	},
	
    // FUNCTION: draws the pause screen
	drawPauseScreen: function (ctx) {
		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("... PAUSED ...", this.WIDTH/2, this.HEIGHT/2, "40pt Courier", "white");
		ctx.restore();
	}
};