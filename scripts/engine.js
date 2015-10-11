// engine.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.engine = (function(){
	console.log("loaded engine.js module");
	
	/* VARIABLES */
	// SCREEN AND AUDIO VARIABLES
	var audioElement;			// audio player reference
	var songSource;				// current song information
	var canvas,ctx;				// canvas references
	var mouseX, mouseY;			// mouse coordinates
	var animationID;			// stores animation ID of animation frame
	var paused = false;			// if the game is paused
	var mouseDown = false;		// if the mouse is being held down
	
	// ASSETS
	var grassImg = new Image();
	var lavaImg = new Image();
	
	// GAME VARIABLES
	// General
	var globalGameSpeed;		// current speed of the game, mainly used for faster terrain
	var KEY = {					// "enum" equating keycodes to names (e.g. keycode 32 = spacebar)
		SPACE: 32,
		A: 65,
		D: 68,
		S: 83,
		W: 87
	};
	var GAME_STATE = {			// "enum" of the current status of the gmae
		RUNNING: 0,
		DEAD: 1
	};
	var currentGameState = 0;	// what is currently happening in the game
	var keys = [];				// array to store pressed keys
	var score = 0;				// current score, = number of terrain objects passed
	// Terrain
	var currentTerrainType;		// current type of floor object being generated
	var terrainCount;			// number of terrain type to be generated before switching
	var TERRAIN_WIDTH = 100;	// width of each terrain object, think of it like "block width"
	var TERRAIN_HEIGHT = 100;	// height of each terrain object, how high from the bottom it goes
	var terrains = [];			// array to hold terrain objects
	var TERRAIN_TYPE = {		// "enum" of terrain types
		GRASS: 0,
		VOID: 1,
		LAVA: 2,
		ROCK: 3
	};
	// Player
	var players = [];
	var PLAYER_WIDTH = 50; 		// width of a player
	var PLAYER_HEIGHT = 50; 	// height of a player
	
	// PHYSICS VARIABLES
	var GRAVITY = 0.98;			// global gravity
	var jumpFunction = function() { return 1000/60*TERRAIN_WIDTH/globalGameSpeed; };
	var globalLastTerrain = {};
	
	
	
	// Set up canvas and game variables
	function init() {
		// SETUP: canvas and audio
		// canvas
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext("2d")
		
		// get reference to audio element
		audioElement = document.querySelector('audio');
		
		// load default song and title, and play
		playStream(audioElement);
		
		loadAssets();
		setupGame();
		
		// taps working as jumps 
		canvas.addEventListener("mousedown", function(e) {
			mouseDown = true;
			e.preventDefault();
			
			// Switch party order on clicks
			// loop and cycle
			for (var i = 0; i < players.length; ++i) {
				// left click - cycle left
				if (e.which == 1)
					players[i].cycleOrder(1);
				// right click - cycle right
				if (e.which == 3)
					players[i].cycleOrder(-1);
			};
			
			// if the player has died
			if (currentGameState == GAME_STATE.DEAD) {
				// restart the game
				setupGame();
			};
		}.bind(this));
		// compatibility for touch devices
		canvas.addEventListener("touchstart", function(e) { 
			mouseDown = true;
			e.preventDefault();
			
			// if the game is running (player is alive)
			if (currentGameState == GAME_STATE.RUNNING) {
				for (var i = 0; i < players.length; ++i) {
					// loop players and jump after a delay based on party order
					setTimeout(players[i].jump, i*jumpFunction(), 15, 1);
				};
			};
			// if the player has died
			if (currentGameState == GAME_STATE.DEAD) {
				// restart the game
				setupGame();
			};
		}.bind(this));
		// taps working as jumps
		canvas.addEventListener("mouseup", function(e) { mouseDown = false; });
		canvas.addEventListener("touchend", function(e) { mouseDown = false; });
		
		// callback for button presses
		window.addEventListener("keydown", keyPress);
		// callback for button presses
		window.addEventListener("keyup", keyRelease);
		
		// BEGIN: start animation loop
		update();
	};
	
	// Setup a new game
	function setupGame() {
		// reset variables
		score = 0;
		terrains = [];
		currentGameState = GAME_STATE.RUNNING;
		
		// SETUP: game
		globalGameSpeed = 8;
		currentTerrainType = TERRAIN_TYPE.GRASS;
		// generate initial terrain
		for (var i = 0; i < Math.floor(canvas.width*1.5/TERRAIN_WIDTH); ++i) {
			terrains[i] = new Terrain(i*TERRAIN_WIDTH);
		}
		
		// starting variables
		currentTerrainType = Math.round(Math.random()+1);
		terrainCount = Math.round(Math.random()+1);
		
		// create the player
		for (var i = 0; i < 3; ++i) {
			players[i] = new Player(i);
		};
	};
	
	// Load game assets (images and sounds)
	function loadAssets() {
		grassImg.src = "assets/grass.png";
		lavaImg.src = "assets/lava.png";
	};
	
	// change song
	function playStream(audioElement){
		audioElement.src = songSource;
		audioElement.play();
		audioElement.volume = 0.2;
	};
	
	// main game tick
	function update() {
		// scedule next draw frame
		animationID = requestAnimationFrame(update);
	 	
	 	// if paused, bail out of loop
		if (paused && currentGameState == GAME_STATE.RUNNING) {
			return;
		}
		
		// if there are no players left, end the game
		if (players.length == 0)
			currentGameState = GAME_STATE.DEAD;
		
		// clear the screen
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// update players
		for (var i = 0; i < players.length; ++i) {
			players[i].update();
		};
		
		// update & draw terrain objects
		for (var i = 0; i < terrains.length; ++i) {
			// update it
			terrains[i].update();
			
			// get currently looped terrain object
			var currentTerrain = terrains[i];
			
			// delete the object if it has gone off screen a bit
			if (currentTerrain.position.x < -TERRAIN_WIDTH*2) {
				terrains.splice(i, 1);
				// speed up the game very slightly for each passed terrain
				globalGameSpeed = Math.min(15, globalGameSpeed+0.02);
				// add 1 point for each passed terrain if the game is running
				if (currentGameState == GAME_STATE.RUNNING)
					++score;
			}
		}
		
		// attempt to create new terrain objects if last one is fully on screen
		var lastX = terrains[terrains.length-1].position.x+TERRAIN_WIDTH;	// get last terrain object's position
		if (lastX < canvas.width) {
			terrains[terrains.length] = new Terrain(lastX);	// create a new terrain at the edge of the last one
			--terrainCount;	// subtract from the number of terrains of current type to make
			
			// check if we've reached the end of this terrain type
			if (terrainCount <= 0) {
				// force grass to generate after each other terrain type
				if (currentTerrainType != TERRAIN_TYPE.GRASS) {
					currentTerrainType = TERRAIN_TYPE.GRASS;
					// grass patches get shorter as game speeds up
					terrainCount = Math.max(3, 15 - globalGameSpeed);
				}
				// otherwise, generate another "danger terrain"
				else {
					// terrain type becomes random danger
					currentTerrainType = Math.round(Math.random()+1);
					// danger patches get larger as game speeds up
					terrainCount = Math.min(5, Math.floor(Math.random()*globalGameSpeed/5) + 1);
				}
			}
		};
		
		// draw death screen if player has died
		if (currentGameState == GAME_STATE.DEAD) {
			ctx.save();
			ctx.fillColor = "black";
			ctx.globalAlpha = 0.7;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "You died.", canvas.width/2, canvas.height/2 - 40, "30pt Calibri", "white");
			fillText(ctx, "Score: " + score, canvas.width/2, canvas.height/2, "24pt Calibri", "white");
			fillText(ctx, "Press space to restart", canvas.width/2, canvas.height/2 + 40, "24pt Calibri", "white");
			ctx.restore();
		};
	};
	
	// CLASS: terrain object
	var Terrain = function(startX) {		
		/* VARIABLES */
		// starting terrain position
		this.position = {
			x: startX,
			y: canvas.height-TERRAIN_HEIGHT
		};
		// terrain's type is global type at time of its spawn 
		this.terrainType = currentTerrainType;
		
		// FUNCTION: update terrain position, draw it
		this.update = function() {
			// slide terrain object left
			this.position.x -= globalGameSpeed;
			
			// try to push players
			for (var i = 0; i < players.length; ++i) {
				// only push if this terrain is solid
				if (this.terrainType == TERRAIN_TYPE.GRASS) {
					// if the player's y overlaps the terrain's
					if (players[i].position.y + PLAYER_HEIGHT > this.position.y && players[i].position.y < this.position.y + TERRAIN_HEIGHT) {
						// if the player's side is pushed into the terrain
						if (players[i].position.x + PLAYER_WIDTH > this.position.x && players[i].position.x < this.position.x + TERRAIN_WIDTH) {
							// push the player against the terrain
							players[i].position.x = this.position.x - PLAYER_WIDTH;
						};
					};
				};
			};
			
			// draw the terrain object
			ctx.save();
			switch(this.terrainType) {
				// void, do nothing
				case TERRAIN_TYPE.VOID:
					break;
				// grassy terrain
				case TERRAIN_TYPE.GRASS:
					ctx.drawImage(grassImg, this.position.x, this.position.y);
					//ctx.fillStyle = "green";
					//ctx.fillRect(this.position.x, this.position.y, TERRAIN_WIDTH+1, TERRAIN_HEIGHT);
					//ctx.fill();
					break;
				// lava
				case TERRAIN_TYPE.LAVA:
					ctx.drawImage(lavaImg, this.position.x, this.position.y);
					//ctx.fillStyle = "rgb(210, 90, 15)";
					//ctx.fillRect(this.position.x, this.position.y+TERRAIN_HEIGHT*0.1, TERRAIN_WIDTH+1, TERRAIN_HEIGHT);
					//ctx.fill();
					break;
				// crystal obstacles
				case TERRAIN_TYPE.ROCK:
					ctx.drawImage(rockImg, this.position.x, this.position.y);
					break;
			};
			ctx.restore();
		};
	};
	
	// CLASS: player object
	var Player = function(order) {
		/* VARIABLES */
		// starting player position
		this.position = {
			x: 275 - order*75,
			y: canvas.height-TERRAIN_HEIGHT-PLAYER_HEIGHT-250
		};
		this.velocity = {
			x: 0,
			y: 0
		};
		this.numJumps = 0;		// number of jumps they've done in current sequence
		this.maxJumps = 2;		// max number of jumps they can do in sequence
		this.order = order;		// order in the party
		this.onGround = true;	// whether the player is currently grounded
		this.color = "rgb(0, 0, " + this.order*75 + ")";
		
		// MUTATOR: force player's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position = {
				x: clamp(x, 0, canvas.width),
				y: clamp(y, 0, canvas.height)
			};
		};
		
		// FUNCTION: force player's velocity
		this.setVelocity = function(x, y) {
			this.velocity = {
				x: x,
				y: y
			};
		};
		
		// FUNCTION: force a jump
		this.jump = function(force, startingPush) {
			// first check if they're on the ground
			if (this.numJumps < this.maxJumps) {
				++this.numJumps;
			
				// give the initial thrust
				this.velocity.y = -force;
				this.position.y -= startingPush;
				this.onGround = false;
				
				/* CURRENTLY NOT USED - HOVERING JUMPS */
				// otherwise, hold them in the air a bit
				//else { 
				//	this.velocity.y -= 1.5;
				//	// stop from jumping after they get too fast
				//	if (this.velocity.y < -15) {
				//		this.canJump = false;
				//		console.log("Player " + order + " can't jump anymore");
				//	};
				//};
			};
		}.bind(this);
		
		// FUNCTION: cycle order by a number
		this.cycleOrder = function(num) {
			this.order = (this.order + num < 0 ? players.length + (this.order + num) : this.order + num) % players.length;
		};
		
		// FUNCTION: update player object
		this.update = function() {
			// clamp order within player list
			this.order = clamp(this.order, 0, players.length-1);
		
			// kill player if off screen
			if (this.position.y > canvas.height*2) {					
				// remove this player from the list of players
				console.log("Dead at " + this.order + "/" + players.length + " at y " + this.position.y);
				
				// slide ones behind this one forward
				for (var i = 0; i < players.length; ++i) {
					if (players[i].order > this.order)
						--players[i].order;
				};
				
				// delete this one
				players.splice(players.indexOf(this), 1);
			};
			
			// try to move towards where it should be in the running order
			if (this.position.x != 275 - this.order*75) {
				// only try to move if its above the terrain level
				if (this.position.y + PLAYER_HEIGHT <= canvas.height - TERRAIN_HEIGHT) {
					// if it's close, round off
					if (Math.abs(this.position.x - (275 - this.order*75)) <= 3) {
						this.position.x = 275 - this.order*75
					}
					// otherwise, move towards where it should be
					else {
						this.position.x -= Math.sign(this.position.x - (275 - this.order*75))*3;
					};
				};
			};
			
			// update onGround variable
			this.onGround = false;
			
			// update if they're on the ground
			// loop through terrain objects
			for (var i = 0; i < terrains.length; ++i) {
				// get currently looped terrain object
				var currentTerrain = terrains[i];
				
				// update onGround variable by comparing pos to each terrain object
				if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x+PLAYER_WIDTH > currentTerrain.position.x) {
					//console.log("Lined up, my feet are at " + (this.position.y + PLAYER_HEIGHT) + " and the terrain is at " + currentTerrain.position.y + " and it is of type " + currentTerrain.terrainType);
					if (this.position.y + PLAYER_HEIGHT == currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS && this.velocity.y >= 0) {
						this.onGround = true;
						break;
					}
				}
			};
			
			// if off ground, update physics and check if on ground
			if (!this.onGround) {		
				// update phsyics
				this.velocity.y += GRAVITY
					
				// loop through velocity
				for (var i = 0; i < Math.abs(this.velocity.y); ++i) {
					// distance to move this loop - 1 each pixel, or the decimal
					// remainder of velocity on the last loop
					var moveDist = (Math.abs(this.velocity.y) - i < 1 ? Math.abs(this.velocity.y) - i : 1) * Math.sign(this.velocity.y);
					
					// variable to store if its safe to move
					var positionSafe = true;
					
					// loop through terrain objects and check if we can move down
					for (var ii = 0; ii < terrains.length; ++ii) {
						// get currently looped terrain object
						var currentTerrain = terrains[ii];
						
						// check is position we'd move to is safe (above terrain)
						// terrain we're checking is below is
						if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x+PLAYER_WIDTH > currentTerrain.position.x) {
							// terrain below us is solid ground and we'd be inside it if we moved down
							if (this.position.y + PLAYER_HEIGHT + moveDist > currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS) {
								// it's not safe to move
								positionSafe = false;
								break;
							};
						};
					};
					
					// if we're safe to move, shift down
					if (positionSafe || this.position.y + PLAYER_HEIGHT > currentTerrain.position.y) {
						this.position.y += moveDist;
					}
					// otherwise, stick to the terrain
					else {
						this.velocity.y = 0;
						this.position.y = canvas.height - TERRAIN_HEIGHT - PLAYER_HEIGHT;
						this.numJumps = 0;
						this.onGround = true;
						break;
					};
				}
			}
			else {
				this.velocity.y = 0;
				this.position.y = canvas.height - TERRAIN_HEIGHT - PLAYER_HEIGHT;
				this.numJumps = 0;
			};
				
			// DRAW: draw the player
			ctx.save();
			ctx.fillStyle = this.color;
			ctx.fillRect(this.position.x, this.position.y, PLAYER_WIDTH, PLAYER_HEIGHT);
			ctx.fill();
			//ctx.strokeStyle = "white";
			//ctx.fillText(this.order, this.position.x + PLAYER_HEIGHT/2, this.position.y - 20);
			//ctx.stroke();
			ctx.restore();
		};
	};
	
	// PAUSE FUNCTION: pauses the game
	function pauseGame() {
		paused = true;
		
		// stop the animation loop if the player is alive
		if (this.currentGameState == GAME_STATE.RUNNING)
			cancelAnimationFrame(animationID);
		
		// draw the pause screen
		ctx.save();
		ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		fillText(ctx, "Paused", canvas.width/2, canvas.height/2, "30pt Calibri", "white");
		ctx.restore();
	};
	
	// RESUME FUNCTION: resumes the game
	function resumeGame() {
		paused = false;
		
		// forcibly end animation loop in case it's running
		// only end the loop if the player is alive
		if (this.currentGameState == GAME_STATE.RUNNING) {
			cancelAnimationFrame(animationID);
			// resume ticking
			update();
		}
	};
	
	// HELPER: get mouse coordinates on canvas
	function getMouse(e) {
		mouseX = e.pageX - e.target.offsetLeft;
		mouseY = e.pageY - e.target.offsetTop;
	};
	
	 // activates full screen
	function requestFullscreen(element) {
		if (element.requestFullscreen) {
		  element.requestFullscreen();
		} else if (element.mozRequestFullscreen) {
		  element.mozRequestFullscreen();
		} else if (element.mozRequestFullScreen) {
		  element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
		  element.webkitRequestFullscreen();
		};
		// no response if unsupported
	};
	
	// FUNCTION: do things based on key presses
	function keyPress(e) {
		keys[e.keyCode] = true;
		// spacebar - jump!
		if (e.keyCode == KEY.SPACE) {
			// loop players and jump after a delay based on party order
			for (var i = 0; i < players.length; ++i) {
				setTimeout(players[i].jump, players[i].order*jumpFunction(), 15, 1);
				globalLastTerrain = terrains[terrains.length-1];
			};
			
			// prevent spacebar page scrolling
			e.preventDefault();
		};
	};
	
	// FUNCTION: do things based on key releases
	function keyRelease(e) {
		keys[e.keyCode] = false;
		// spacebar - jump!
		if (e.keyCode == KEY.SPACE) {
			// prevent spacebar page scrolling
			e.preventDefault();
			
			// if the player has died
			if (currentGameState == GAME_STATE.DEAD) {
				// restart the game
				setupGame();
			};
		};
	};
	
	// return public interface for engine module
	return {
		init: init,
		setupGame: setupGame,
		loadAssets: loadAssets,
		playStream: playStream,
		update: update,
		Terrain: Terrain,
		Player: Player,
		pauseGame: pauseGame,
		resumeGame: resumeGame,
		getMouse: getMouse,
		requestFullscreen: requestFullscreen,
		keyPress: keyPress,
		keyRelease: keyRelease
	};
}());