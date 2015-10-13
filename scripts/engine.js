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
		E: 69,
		P: 80,
		Q: 81,
		R: 82,
		S: 83,
		W: 87
	};
	var GAME_STATE = {			// "enum" of the current status of the gmae
		RUNNING: 0,				// players are alive and running
		SWITCHING: 1,			// players are swapping positions
		DEAD: 2					// entire party is dead
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
	// Player classes
	var PLAYER_CLASSES = {		// enum storing class info
		PALADIN: {
			name: "Paladin",
			health: 150,
			color: "rgb(255, 255, 200)",
			img: new Image(),
			width: 85,
			height: 125
		},
		RANGER: {
			name: "Ranger",
			health: 75,
			color: "rgb(100, 0, 0)",
			img: new Image(),
			width: 80,
			height: 125
		},
		MAGI: {
			name: "Magi",
			health: 100,
			color: "rgb(0, 0, 100)",
			img: new Image(),
			width: 50,
			height: 50
		}
	};
	// Enemies
	var enemies = [];
	var ENEMY_TYPES = {
		GOBLIN: {
			name: "Goblin",
			health: 25,
			color: "rgb(50, 125, 0)",
			img: new Image(),
			width: 85,
			height: 85
		},
		RAT: {
			name: "Rat",
			health: 15,
			color: "rgb(127, 127, 127)",
			img: new Image(),
			width: 100,
			height: 50
		},
		BAT: {
			name: "Bat",
			health: 20,
			color: "rgb(75, 75, 75)",
			img: new Image(),
			width: 85,
			height: 50
		}
	};
	
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
			// loop and cycle if they aren't running already
			if (currentGameState == GAME_STATE.RUNNING) {
				for (var i = 0; i < players.length; ++i) {
					// left click - cycle left
					if (e.which == 1)
						players[i].cycleOrder(1);
					// right click - cycle right
					if (e.which == 3)
						players[i].cycleOrder(-1);
				};
				
				// players are now switching positions
				currentGameState = GAME_STATE.SWITCHING;
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
		terrainCount = 2;
		
		// create the player
		players[0] = new Player(PLAYER_CLASSES.PALADIN);
		players[1] = new Player(PLAYER_CLASSES.RANGER);
		players[2] = new Player(PLAYER_CLASSES.MAGI);
		
		enemies[0] = new Enemy(ENEMY_TYPES.GOBLIN);
	};
	
	// Load game assets (images and sounds)
	function loadAssets() {
		grassImg.src = "assets/grass.png";
		lavaImg.src = "assets/lava.png";
		PLAYER_CLASSES.PALADIN.img.src = "assets/paladin.png";
		PLAYER_CLASSES.RANGER.img.src = "assets/ranger.png";
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
		
		// update enemies
		for (var i = 0; i < enemies.length; ++i) {
			enemies[i].update();
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
		// get position of last terrain object's edge
		var lastX = terrains[terrains.length-1].position.x+TERRAIN_WIDTH;
		// if the last 
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
					terrainCount = Math.min(7, Math.floor(Math.random()*globalGameSpeed/5) + 2);
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
	function Terrain(startX) {		
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
					if (players[i].position.y + players[i].bounds.height > this.position.y && players[i].position.y < this.position.y + TERRAIN_HEIGHT) {
						// if the player's side is pushed into the terrain
						if (players[i].position.x + players[i].bounds.width > this.position.x && players[i].position.x < this.position.x + TERRAIN_WIDTH) {
							// push the player against the terrain
							players[i].position.x = this.position.x - players[i].bounds.width;
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
	function Player(classType) {
		/* VARIABLES */
		this.classType = classType;		// player's class - Paladin, Ranger, or Magi
		this.numJumps = 0;				// number of jumps they've done in current sequence
		this.maxJumps = 2;				// max number of jumps they can do in sequence
		this.order = players.length; 	// order in the party - defaults to last
		this.onGround = true;			// whether the player is currently grounded
		this.color = this.classType.color; // color player will draw at if they have no image
		this.bounds = {
			width: this.classType.width,
			height: this.classType.height
		};
		this.position = {				// starting player position
			x: 275 - players.length*75,
			y: canvas.height-TERRAIN_HEIGHT-this.bounds.height-250
		};
		this.velocity = {				// starting player velocity
			x: 0,
			y: 0
		};
		
		// MUTATOR: force player's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position = {
				x: clamp(x, 0, canvas.width),
				y: clamp(y, 0, canvas.height)
			};
		};
		// MUTATOR: force player's velocity
		this.setVelocity = function(x, y) {
			this.velocity = {
				x: x,
				y: y
			};
		};
		// FUNCTION: cycle order by a number
		// can be negative to cycle right
		this.cycleOrder = function(num) {
			this.order = (this.order + num < 0 ? players.length + (this.order + num) : this.order + num) % players.length;
		};
		// FUNCTION: prints player information to console
		this.toString = function() {
			console.log("Player in position " + this.order + " is at x" + this.position.x + " y" + this.position.y);
		};
		// FUNCTION: force a jump
		this.jump = function(speed, startingPush, force) {
			// first check if they're on the ground
			if (this.numJumps < this.maxJumps || force) {
				++this.numJumps;
			
				// give the initial thrust
				this.velocity.y = -speed;
				this.position.y -= startingPush;
				this.onGround = false;
			};}.bind(this);
		
		// FUNCTION: main player object tick
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
				if (this.position.y + this.bounds.height <= canvas.height - TERRAIN_HEIGHT) {
					// if it's close, round off
					if (Math.abs(this.position.x - (275 - this.order*75)) <= 3) {
						this.position.x = 275 - this.order*75
					}
					// otherwise, move towards where it should be
					else {
						this.position.x -= Math.sign(this.position.x - (275 - this.order*75))*3;
					};
				};
					
				// loop players and update game state if they're done switching
				if (currentGameState == GAME_STATE.SWITCHING) {
					var allSwitched = true;
					for (var i = 0; i < players.length; ++i)
						if (players[i].position.x != 275 - players[i].order*75)
							allSwitched = false;
							
					if (allSwitched)
						currentGameState = GAME_STATE.RUNNING;
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
				if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
					if (this.position.y + this.bounds.height == currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS && this.velocity.y >= 0) {
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
						if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
							// terrain below us is solid ground and we'd be inside it if we moved down
							if (this.position.y + this.bounds.height + moveDist > currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS) {
								// it's not safe to move
								positionSafe = false;
								break;
							};
						};
					};
					
					// if we're safe to move, shift down
					if (positionSafe || this.position.y + this.bounds.height > currentTerrain.position.y) {
						this.position.y += moveDist;
					}
					// otherwise, stick to the terrain
					else {
						this.velocity.y = 0;
						this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
						this.numJumps = 0;
						this.onGround = true;
						break;
					};
				}
			}
			else {
				this.velocity.y = 0;
				this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
				this.numJumps = 0;
			};
				
			// DRAW: draw the player
			this.draw();
		};
	
		// FUCNTION: main player draw call
		this.draw = function() {
			ctx.save();
			switch (this.classType) {
				case (PLAYER_CLASSES.MAGI):
					ctx.fillStyle = this.color;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.width, this.bounds.height);
					ctx.fill();
					break;
				default:
					ctx.drawImage(this.classType.img, this.position.x, this.position.y);
					break;
			};
			ctx.restore();
		};
			
		/* ATTACKING */
		// FUNCTION: 1st attack ('Q')
		this.baseAttack = function() {
			switch(this.classType) {
				case PLAYER_CLASSES.PALADIN:
					this.jump(15, 1, true);
					break;
				case PLAYER_CLASSES.RANGER:
					this.setPosition(this.position.x, this.position.y/2);
					break;
				case PLAYER_CLASSES.MAGI:
					terrains.splice(terrains.length-1, 1);
					break;
			};
		};
	};
 
	// CLASS: projectile
	function Projectile(x, y, towards, projType) {
		// type of projectile
		this.projType = projType;
		// the projectile's bounding box
		this.bounds = {
			width: this.projType.width,
			height: this.projType.height
		};
		// starting projectile position
		this.position = {
			x: x,
			y: y
		};
		// starting projectile velocity
		// directs itself towards the "towards" object passed in
		this.velocity = {
			x: (towards.position.x - this.position.x)/20,
			y: (towards.position.y - this.position.y)/20
		};
		
		// MUTATOR: force player's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position = {
				x: x,
				y: y
			};
		};
		// MUTATOR: force player's velocity
		this.setVelocity = function(x, y) {
			this.velocity = {
				x: x,
				y: y
			};
		};
		// FUNCTION: cycle order by a number
		// can be negative to cycle right
		this.cycleOrder = function(num) {
			this.order = (this.order + num < 0 ? players.length + (this.order + num) : this.order + num) % players.length;
		};
		// FUNCTION: prints player information to console
		this.toString = function() {
			console.log("Player in position " + this.order + " is at x" + this.position.x + " y" + this.position.y);
		};
		// FUNCTION: force a jump
		this.jump = function(speed, startingPush, force) {
			// first check if they're on the ground
			if (this.numJumps < this.maxJumps || force) {
				++this.numJumps;
			
				// give the initial thrust
				this.velocity.y = -speed;
				this.position.y -= startingPush;
				this.onGround = false;
			};}.bind(this);
		
		// FUNCTION: main player object tick
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
				if (this.position.y + this.bounds.height <= canvas.height - TERRAIN_HEIGHT) {
					// if it's close, round off
					if (Math.abs(this.position.x - (275 - this.order*75)) <= 3) {
						this.position.x = 275 - this.order*75
					}
					// otherwise, move towards where it should be
					else {
						this.position.x -= Math.sign(this.position.x - (275 - this.order*75))*3;
					};
				};
					
				// loop players and update game state if they're done switching
				if (currentGameState == GAME_STATE.SWITCHING) {
					var allSwitched = true;
					for (var i = 0; i < players.length; ++i)
						if (players[i].position.x != 275 - players[i].order*75)
							allSwitched = false;
							
					if (allSwitched)
						currentGameState = GAME_STATE.RUNNING;
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
				if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
					if (this.position.y + this.bounds.height == currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS && this.velocity.y >= 0) {
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
						if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
							// terrain below us is solid ground and we'd be inside it if we moved down
							if (this.position.y + this.bounds.height + moveDist > currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS) {
								// it's not safe to move
								positionSafe = false;
								break;
							};
						};
					};
					
					// if we're safe to move, shift down
					if (positionSafe || this.position.y + this.bounds.height > currentTerrain.position.y) {
						this.position.y += moveDist;
					}
					// otherwise, stick to the terrain
					else {
						this.velocity.y = 0;
						this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
						this.numJumps = 0;
						this.onGround = true;
						break;
					};
				}
			}
			else {
				this.velocity.y = 0;
				this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
				this.numJumps = 0;
			};
				
			// DRAW: draw the player
			this.draw();
		};
	
		// FUCNTION: main player draw call
		this.draw = function() {
			ctx.save();
			switch (this.classType) {
				case (PLAYER_CLASSES.MAGI):
					ctx.fillStyle = this.color;
					ctx.fillRect(this.position.x, this.position.y, this.bounds.width, this.bounds.height);
					ctx.fill();
					break;
				default:
					ctx.drawImage(this.classType.img, this.position.x, this.position.y);
					break;
			};
			ctx.restore();
		};
	};
	
	// CLASS: enemy object
	function Enemy(enemyType) {
		/* VARIABLES */
		this.enemyType = enemyType;		// what type of enemy this is
		this.numJumps = 0;				// number of jumps they've done in current sequence
		this.maxJumps = 2;				// max number of jumps they can do in sequence
		this.onGround = true;			// whether the enemy is currently grounded
		this.color = this.enemyType.color; // color enemy will draw at if they have no image
		this.bounds = {
			width: this.enemyType.width,
			height: this.enemyType.height
		};
		this.position = {				// starting enemy position
			x: canvas.width-this.bounds.width*5,
			y: canvas.height-TERRAIN_HEIGHT-this.bounds.height*2
		};
		this.targetPos = {
			x: canvas.width - this.bounds.width*1.5,
			y: canvas.height-TERRAIN_HEIGHT-this.bounds.height
		};
		this.velocity = {				// starting enemy velocity
			x: 0,
			y: 0
		};
		
		// MUTATOR: force enemy's position
		this.setPosition = function(x, y) {
			this.position = {
				x: x,
				y: y
			};
		};
		// MUTATOR: force enemy's velocity
		this.setVelocity = function(x, y) {
			this.velocity = {
				x: x,
				y: y
			};
		};
		// FUNCTION: prints enemy information to console
		this.toString = function() {
			console.log("Enemy " + this.enemyType + " is at x" + this.position.x + " y" + this.position.y);
		};
		// FUNCTION: force a jump
		this.jump = function(speed, startingPush, force) {
			// first check if they're on the ground
			if (this.numJumps < this.maxJumps || force) {
				++this.numJumps;
			
				// give the initial thrust
				this.velocity.y = -speed;
				this.position.y -= startingPush;
				this.onGround = false;
			};}.bind(this);
		
		// FUNCTION: main enemy object tick
		this.update = function() {
			// kill enemy if off screen
			if (this.position.y > canvas.height*2) {
				// delete this one
				enemies.splice(enemies.indexOf(this), 1);
			};
			
			// home towards target position
			if (this.targetPos != undefined) {
				// only homes left-right for now
				// if it's close, snap to its homing position
				if (Math.abs(this.position.x - this.targetPos.x) <= 3) {
					this.position.x = this.targetPos.x;
					this.targetPos = undefined;
				}
				// otherwise, move towards where it should be
				else {
					this.position.x -= Math.sign(this.position.x - this.targetPos.x)*5;
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
				if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
					if (this.position.y + this.bounds.height == currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS && this.velocity.y >= 0) {
						this.onGround = true;
						break;
					}
				}
			};
			
			// if off ground, update physics and check if on ground
			if (!this.onGround) {
				// attempt to jump if it falls below the terrain line
				if (this.position.y + this.bounds.height >= canvas.height - TERRAIN_HEIGHT)
					this.jump(15, 1);
			
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
						if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currentTerrain.position.x) {
							// terrain below us is solid ground and we'd be inside it if we moved down
							if (this.position.y + this.bounds.height + moveDist > currentTerrain.position.y && currentTerrain.terrainType == TERRAIN_TYPE.GRASS) {
								// it's not safe to move
								positionSafe = false;
								break;
							};
						};
					};
					
					// if we're safe to move, shift down
					if (positionSafe || this.position.y + this.bounds.height > currentTerrain.position.y) {
						this.position.y += moveDist;
					}
					// otherwise, stick to the terrain
					else {
						this.velocity.y = 0;
						this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
						this.numJumps = 0;
						this.onGround = true;
						break;
					};
				}
			}
			else {
				this.velocity.y = 0;
				this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.height;
				this.numJumps = 0;
			};
				
			// DRAW: draw the enemy
			this.draw();
		};
	
		// FUCNTION: main enemy draw call
		this.draw = function() {
			ctx.save();
			ctx.fillStyle = this.color;
			ctx.fillRect(this.position.x, this.position.y, this.bounds.width, this.bounds.height);
			ctx.fill();
			ctx.restore();
		};
	};
 
	// PAUSE FUNCTION: pauses the game
	function pauseGame() {
		// since pause can be called multiple ways
		// prevents multiple redraws of pause screen
		if (!paused) {
			paused = true;
			
			// stop the animation loop if the player is alive
			if (currentGameState == GAME_STATE.RUNNING)
				cancelAnimationFrame(animationID);
			
			// draw the pause screen
			ctx.save();
			ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			fillText(ctx, "Paused", canvas.width/2, canvas.height/2, "30pt Calibri", "white");
			ctx.restore();
		};
	};
	
	// RESUME FUNCTION: resumes the game
	function resumeGame() {
		paused = false;
		
		// forcibly end animation loop in case it's running
		// only end the loop if the player is alive
		if (currentGameState == GAME_STATE.RUNNING) {
			cancelAnimationFrame(animationID);
			// resume ticking
			update();
		}
	};
	
	// FUNCTION: do things based on key presses
	function keyPress(e) {
		keys[e.keyCode] = true;
		
		// spacebar - jump!
		if (e.keyCode == KEY.SPACE) {
			// loop players and jump after a delay based on party order
			for (var i = 0; i < players.length; ++i) {
				setTimeout(players[i].jump, players[i].order*jumpFunction(), 15, 1, false);
				globalLastTerrain = terrains[terrains.length-1];
			};
			
			// prevent spacebar page scrolling
			e.preventDefault();
		};
		
		// q - make first player trigger Q ability
		if (e.keyCode == KEY.Q) {
			// loop players and only initiate ability on one at order 0
			for (var i = 0; i < players.length; ++i) {
				if (players[i].order == 0)
					players[i].baseAttack();
			};
		};
		
		// p - toggle game paused
		if (e.keyCode == KEY.P) {
			// check if paused, and toggle it
			if (paused)
				resumeGame();
			else
				pauseGame();
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