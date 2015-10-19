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
	var time = 0;
	
	// ASSETS
	var background = new Image();
	var baseImg = new Image();
	var lavaImg = new Image();
	
	// GAME VARIABLES
	// General
	var globalGameSpeed;		// current speed of the game, mainly used for faster terrain
	var KEY = {					// "enum" equating keycodes to names (e.g. keycode 32 = spacebar)
		SPACE: 32,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		A: 65,
		D: 68,
		E: 69,
		P: 80,
		Q: 81,
		R: 82,
		S: 83,
		W: 87
	};
	var GAME_STATE = {			// "enum" of the current status of the game
		START: 0,				// start screen
		RUNNING: 1,				// players are alive and running
		SWITCHING: 2,			// players are swapping positions
		DEAD: 3					// entire party is dead
	};
	var currentGameState = GAME_STATE.START;	// what is currently happening in the game
	var keys = [];				// array to store pressed keys
	var score = 0;				// current score, = number of terrain objects passed
	// Terrain
	var currentTerrainType;		// current type of floor object being generated
	var terrainCount;			// number of terrain type to be generated before switching
	var TERRAIN_WIDTH = 100;	// width of each terrain object, think of it like "block width"
	var TERRAIN_HEIGHT = 100;	// height of each terrain object, how high from the bottom it goes
	var terrains = [];			// array to hold terrain objects
	var TERRAIN_TYPE = {		// "enum" of terrain types
		BASE: 0,
		VOID: 1,
		LAVA: 2
	};
	// Player
	var players = [];
	// Player classes
	var PLAYER_CLASSES = {		// enum storing class info
		PALADIN: {
			name: "Paladin",
			health: 125,
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
			health: 75,
			color: "rgb(50, 125, 0)",
			img: new Image(),
			width: 85,
			height: 85
		},
		RAT: {
			name: "Rat",
			health: 55,
			color: "rgb(127, 127, 127)",
			img: new Image(),
			width: 100,
			height: 50
		},
		BAT: {
			name: "Bat",
			health: 50,
			color: "rgb(75, 75, 75)",
			img: new Image(),
			width: 85,
			height: 50
		}
	};
	// Projectiles
	var projectiles = [];
	var PROJECTILE_TYPES = {
		ARROW: {
			damage: 3,
			img: new Image(),
			width: 45,
			height: 13,
			gravity: true,
			velocity: 2
		},
		FIREBALL: {
			damage: 5,
			img: new Image(),
			width: 25,
			height: 25,
			gravity: false,
			velocity: -30
		}
	};
	
	// PHYSICS VARIABLES
	var GRAVITY = 0.98;			// global gravity
	var jumpFunction = function() { return 1000/60*TERRAIN_WIDTH/globalGameSpeed; };
	var globalLastTerrain = {};
	var newUI = undefined;
	
	
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
		
		// taps working as jumps 
		canvas.addEventListener("mousedown", function(e) {
			mouseDown = true;
			e.preventDefault();
			
			// Switch party order on clicks
			// loop and cycle if they aren't running already
			if (currentGameState == GAME_STATE.RUNNING) {
				for (var i = 0; i < players.length; ++i) {
					// only cycle living players
					if (players[i].deathTime == 0) {
						// left click - cycle left
						if (e.which == 1)
							players[i].cycleOrder(1);
						// right click - cycle right
						if (e.which == 3)
							players[i].cycleOrder(-1);
					}
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
		
		// create starting UI
		//newUI = new UI(canvas.width/4, canvas.height/4, canvas.width/2, canvas.height/2);
		//console.log(newUI);
		//newUI.toggleActive();
		//newUI.setFill("white");
		//newUI.makeButton("Score", canvas.width/2 - 20, canvas.height/2 - 20, 40, 40, function() { game.engine.score += 50; });
		//newUI.toggleButActive("Score");
		
		// BEGIN main game tick
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
		currentTerrainType = TERRAIN_TYPE.BASE;
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
		background.src = "assets/Wall720.png";
		baseImg.src = "assets/TileSandstone100.png";
		lavaImg.src = "assets/lava.png";
		PLAYER_CLASSES.PALADIN.img.src = "assets/paladin.png";
		PLAYER_CLASSES.RANGER.img.src = "assets/ranger.png";
		PROJECTILE_TYPES.ARROW.img.src = "assets/arrow.png";
		PROJECTILE_TYPES.FIREBALL.img.src = "assets/fireball.png";
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
		++time;
		
		// start game if on start screen and space or start is being pressed
		if (currentGameState === GAME_STATE.START) {
			if (keys[KEY.SPACE] || mouseDown) {
				setupGame();
			}
			else {
				ctx.fillStyle = "rgb(20, 20, 20)";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.fill();
				fillText(ctx, "Welcome to Leap of Faith", canvas.width/2, canvas.height/2-100, "30pt Calibri", "white");
				fillText(ctx, "Left or right click to cycle party members left or right", canvas.width/2, canvas.height/2-50, "20pt Calibri", "white");
				fillText(ctx, "Press space to jump. You can double jump.", canvas.width/2, canvas.height/2-20, "20pt Calibri", "white");
				fillText(ctx, "Press Q to activate the party leader's ability", canvas.width/2, canvas.height/2+10, "20pt Calibri", "white");
				fillText(ctx, "Party members respawn after a delay, and they regen health slowly", canvas.width/2, canvas.height/2+40, "20pt Calibri", "white");
				fillText(ctx, "Get points from surviving and killing enemies", canvas.width/2, canvas.height/2+70, "20pt Calibri", "white");
				fillText(ctx, "(The enemies are the boxes with pro jumping skills)", canvas.width/2, canvas.height/2+95, "12pt Calibri", "white");
				fillText(ctx, "Press space to start", canvas.width/2, canvas.height/2+140, "20pt Calibri", "white");
				fillText(ctx, "Have fun.", canvas.width/2, canvas.height/2+170, "20pt Calibri", "white");
			}
			return;
		}
	 	
	 	// if paused, bail out of loop
		if (paused && currentGameState === GAME_STATE.RUNNING) {
			return;
		}
		
		// if there are no players left, end the game
		if (players.length == 0)
			currentGameState = GAME_STATE.DEAD;
		
		// Switch party order with left or right arrow keys
		// loop and cycle if they aren't switching already
		if (currentGameState == GAME_STATE.RUNNING) {
			for (var i = 0; i < players.length; ++i) {
				// only cycle living players
				if (players[i].deathTime == 0) {
					// left click - cycle left
					if (keys[KEY.LEFT]) {
						players[i].cycleOrder(1);
						currentGameState = GAME_STATE.SWITCHING;
					}
					// right click - cycle right
					else
					if (keys[KEY.RIGHT]) {
						players[i].cycleOrder(-1);			
						// players are now switching positions
						currentGameState = GAME_STATE.SWITCHING;
					}
				}
			};
		};
		
		// clear the screen
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// draw the parallax background
		for (var i = -(time*3 % 500); i < canvas.width; i += 500) {
			ctx.drawImage(background, i, 0);
		}
		
		// update players
		var numDead = 0;
		for (var i = 0; i < players.length; ++i) {
			// if player is alive, update
			if (players[i].deathTime == 0)
				players[i].update();
			// if they're dead, increment death counter and respawn if it's been long enough
			else {
				++numDead;
				++players[i].deathTime;
				// respawn
				if (players[i].deathTime >= 1200) {
					// get number of living players
					var numAlive = 0;
					for (var ii = 0; ii < players.length; ++ii)
						if (players[ii].deathTime == 0)
							++numAlive;
							
					players[i].deathTime = 0;
					players[i].health = players[i].maxHealth/2;
					players[i].order = numAlive;
				}
			}
		};
		
		// if everyone is dead, send game to death screen
		if (numDead === players.length) {
			players = [];
			currentGameState = GAME_STATE.DEAD;
		}
		
		// add an enemy if there isn't one
		if (enemies.length === 0) {
			switch(Math.round(rand(0, 2))) {
				case 0: enemies.push(new Enemy(ENEMY_TYPES.GOBLIN));
					break;
				case 1: enemies.push(new Enemy(ENEMY_TYPES.RAT));
					break;
				default: enemies.push(new Enemy(ENEMY_TYPES.BAT));
					break;
			}
		}
		
		// update enemies
		for (var i = 0; i < enemies.length; ++i) {
			enemies[i].update();
		};
		
		// update projectiles
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].update();
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
				if (currentGameState == GAME_STATE.RUNNING || currentGameState == GAME_STATE.SWITCHING)
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
				// force base ground to generate after each other terrain type
				if (currentTerrainType != TERRAIN_TYPE.BASE) {
					currentTerrainType = TERRAIN_TYPE.BASE;
					// ground patches get shorter as game speeds up
					terrainCount = Math.max(3, 15 - globalGameSpeed);
				}
				// otherwise, generate another "danger terrain"
				else {
					// terrain type becomes random danger
					currentTerrainType = Math.round(Math.random()+1);
					// danger patches get larger as game speeds up
					terrainCount = Math.min(5, Math.floor(Math.random()*globalGameSpeed/5) + 2);
				}
			}
		};
		
		// draw score in upper right
		if (currentGameState != GAME_STATE.DEAD) {
			var grad = ctx.createLinearGradient(0, 0, 150, 0);
				grad.addColorStop(0, "rgba(0, 0, 0, 0)");
				grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
				ctx.fillStyle = grad;
				ctx.fillRect(canvas.width-150, 0, 150, 50);
				fillText(ctx, "Score: " + score, canvas.width - 75, 25, "20pt Calibri", "white");
				ctx.fill();
		}
		
		// draw death screen if player has died
		if (currentGameState == GAME_STATE.DEAD) {
			ctx.save();
			ctx.fillStyle = "black";
			ctx.globalAlpha = 0.7;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "You died.", canvas.width/2, canvas.height/2 - 40, "30pt Calibri", "white");
			fillText(ctx, "Score: " + score, canvas.width/2, canvas.height/2, "24pt Calibri", "white");
			fillText(ctx, "Press space to restart", canvas.width/2, canvas.height/2 + 40, "24pt Calibri", "white");
			ctx.restore();
		};
	
		// draw UI elements
		newUI.updateAndDraw();
	};
	
	// BASE CLASS: game object with physics and bounding box variables
	function GameObject() {
		// starting position of game object
		this.position = new Victor(0, 0);
		// bounding box width and height for game object
		this.bounds = {
			width: 0,
			height: 0
		};
		
		// MUTATOR: force object's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position.x = clamp(x, 0, canvas.width);
			this.postiion.y = clamp(y, 0, canvas.height);
		};
	};
	
	// BASE CLASS: game object that can move
	function MobileObject() {
		GameObject.call(this);
	
		// starting velocity of game object
		this.velocity = new Victor(0, 0);
		this.numJumps = 0;		// number of jumps the object has done in current sequence
		this.maxJumps = 2;		// max number of jumps the object can do in sequence
		this.onGround = true;	// whether the object is currently grounded
		this.maxHealth = 0; 	// this object's max health
		this.health = 0; 	// this object's current health
		
		// MUTATOR: force object's velocity
		this.setVelocity = function(x, y) {
			this.velocity = new Victor(x, y);
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
	};
	
	// CLASS: terrain object
	function Terrain(startX) {
		GameObject.call(this);
		
		/* VARIABLES */
		// starting terrain position
		this.position = new Victor(
			startX,
			canvas.height-TERRAIN_HEIGHT
		);
		// terrain's type is global type at time of its spawn 
		this.terrainType = currentTerrainType;
		// if the terrain has been iced by the wizard's spell - acts as solid
		this.iced = false;
		
		// check if the magi just activated its ice spell, and if so, freeze this terrain
		for (var i = 0; i < players.length; ++i)
			if (players[i].classType == PLAYER_CLASSES.MAGI && players[i].qCooldown > 250 && players[i].deathTime == 0)
				this.iced = true;
		
		// FUNCTION: returns if the terrain is solid
		this.isSolid = function() {
			return this.terrainType === TERRAIN_TYPE.BASE || this.iced;
		}
		
		// FUNCTION: update terrain position, draw it
		this.update = function() {
			// slide terrain object left
			this.position.x -= globalGameSpeed;
			
			// try to push players
			for (var i = 0; i < players.length; ++i) {
				// first, check player is alive
				if (players[i].deathTime == 0)
					// if the player's y overlaps the terrain's
					if (players[i].position.y + players[i].bounds.height > this.position.y && players[i].position.y < this.position.y + TERRAIN_HEIGHT) {
						// if the player's side is pushed into the terrain
						if (players[i].position.x + players[i].bounds.width > this.position.x && players[i].position.x < this.position.x + TERRAIN_WIDTH) {
							// only push if this terrain is solid
							if (this.isSolid()) {
								// push the player against the terrain
								players[i].position.x = this.position.x - players[i].bounds.width;
							}
							
							// if it's lava, bounce the player and damage them
							if (this.terrainType === TERRAIN_TYPE.LAVA && players[i].position.y + players[i].bounds.height > this.position.y + TERRAIN_HEIGHT/10) {
								players[i].jump(15, 1, true);
								players[i].health -= 10;
							}
						};
					};
			};
			
			// draw the terrain object
			ctx.save();
			switch(this.terrainType) {
				// void, do nothing
				case TERRAIN_TYPE.VOID:
					break;
				// base terrain
				case TERRAIN_TYPE.BASE:
					ctx.drawImage(baseImg, this.position.x, this.position.y);
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
			};
			
			// check if it's been frozen by the wizard
			if (this.iced) {
				ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
				ctx.fillRect(this.position.x, this.position.y, TERRAIN_WIDTH, TERRAIN_HEIGHT);
				ctx.fill();
			}
			ctx.restore();
		};
	};
	
	// CLASS: player object
	function Player(classType) {
		MobileObject.call(this);
	
		/* VARIABLES */
		this.classType = classType;		// player's class - Paladin, Ranger, or Magi
		this.maxJumps = 2;				// max number of jumps they can do in sequence
		this.order = players.length; 	// order in the party - defaults to last
		this.color = this.classType.color; // color player will draw at if they have no image
		this.maxHealth = this.health = classType.health; // this player's health and max health
		this.qCooldown = -150;
		this.deathTime = 0;
		this.bounds = {					// the player's bounding width and height
			width: this.classType.width,
			height: this.classType.height
		};
		this.position = new Victor(		// starting player position
			275 - players.length*75,
			canvas.height-TERRAIN_HEIGHT-this.bounds.height-250
		);
		
		// FUNCTION: cycle order by a number
		// can be negative to cycle right
		this.cycleOrder = function(num) {
			// get number of living players
			var numAlive = 0;
			for (var i = 0; i < players.length; ++i)
				if (players[i].deathTime == 0)
					++numAlive;
		
			this.order = (this.order + num < 0 ? numAlive + (this.order + num) : this.order + num) % numAlive;
		};
		// FUNCTION: prints player information to console
		this.toString = function() {
			console.log("Player in position " + this.order + " is at " + this.position.toString());
		};
		
		// FUNCTION: main player object tick
		this.update = function() {		
			// kill player if off screen or at 0 health
			if (this.position.y > canvas.height*2 || this.health <= 0) {		
				// remove this player from the list of players
				console.log("Dead at " + this.order + "/" + players.length + " at y " + this.position.y);
				
				// slide ones behind this one forward
				for (var i = 0; i < players.length; ++i) {
					if (players[i].order > this.order && players[i].deathTime == 0)
						--players[i].order;
				};
				
				// delete this one
				// players.splice(players.indexOf(this), 1);
				// start this one's death counter
				++this.deathTime;
			};
			
			// regen some health and clamp health within 0 and max
			this.health += 0.02;
			this.health = clamp(this.health, 0, this.maxHealth);
			
			// decrement timing and ability variables
			if (this.qCooldown > -150)
				--this.qCooldown;
			
			// clamp order within player list
			this.order = clamp(this.order, 0, players.length-1);
			
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
						this.position.x -= Math.sign(this.position.x - (275 - this.order*75))*5;
					};
				};
					
				// loop players and update game state if they're done switching
				if (currentGameState == GAME_STATE.SWITCHING) {
					var allSwitched = true;
					for (var i = 0; i < players.length; ++i)
						if (players[i].position.x != 275 - players[i].order*75 && players[i].deathTime == 0)
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
					if (this.position.y + this.bounds.height == currentTerrain.position.y && currentTerrain.isSolid() && this.velocity.y >= 0) {
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
							if (this.position.y + this.bounds.height + moveDist > currentTerrain.position.y && currentTerrain.isSolid()) {
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
			
			// if the one drawing is the paladin and their shield is up, draw it
			if (this.classType == PLAYER_CLASSES.PALADIN && this.qCooldown > 0) {
				// prepare fill style
				ctx.fillStyle = "rgba(0, 255, 255, " + (this.qCooldown/100) + ")";
				// loop players
				for (var i = 0; i < players.length; ++i) {
					// draw shield in front of first player
					var p = players[i];
					if (p.order == 0 && players[i].deathTime == 0)
						ctx.fillRect(p.position.x+p.bounds.width, p.position.y+p.bounds.height-this.bounds.height, 25, this.bounds.height);
				}
				ctx.fill();
			}
			
			// draw health above head
			ctx.fillStyle = "red";
			ctx.fillRect(this.position.x+10, this.position.y - 10, this.bounds.width-20, 5);
			ctx.fillStyle = "green";
			ctx.fillRect(this.position.x+10, this.position.y - 10, (this.bounds.width-20) * (this.health/this.maxHealth), 5);
			
			ctx.restore();
		};
			
		/* ATTACKING */
		// FUNCTION: 1st attack ('Q')
		this.baseAttack = function() {
			switch(this.classType) {
				case PLAYER_CLASSES.PALADIN:
					// if shield is off cooldown, activate it
					if (this.qCooldown <= -50)
						this.qCooldown = 300;
					break;
				case PLAYER_CLASSES.RANGER:
					// shoot an arrow towards the first enemy
					if (this.qCooldown <= -5) {
						projectiles.push(new Projectile(this.position.x+this.bounds.width/2, this.position.y+this.bounds.height/2, enemies[0], PROJECTILE_TYPES.ARROW, false));
						this.qCooldown = 0;
					}
					break;
				case PLAYER_CLASSES.MAGI:
					// ice over terrains
					if (this.qCooldown <= -150 && this.position.y + this.bounds.height <= canvas.height - TERRAIN_HEIGHT) {
						for (var i = 0; i < terrains.length; ++i) {
							terrains[i].iced = true;
						}
						this.qCooldown = 500;
					}
					break;
			};
		};
	};
 
	// CLASS: projectile
	function Projectile(x, y, towards, projType, enemy) {
		MobileObject.call(this);
		
		// type of projectile
		this.projType = projType;
		this.enemyProj = enemy; // whether an enemy fired it (only hits players)
		this.gravity = this.projType.gravity;
		// the projectile's bounding box
		this.bounds = {
			width: this.projType.width,
			height: this.projType.height
		};
		// starting projectile position
		this.position = new Victor(
			x,
			y
		);
		// starting projectile velocity
		// directs itself towards the "towards" object passed in
		this.velocity = new Victor(
			((towards.position.x == undefined ? 0 : towards.position.x) - this.position.x)/(30 - this.projType.velocity),
			((towards.position.y == undefined ? 0 : towards.position.y) - this.position.y)/(30 - this.projType.velocity)
		);
		
		// give an upwards thrust if it's affected by gravity
		if (this.gravity)
			this.velocity.y -= 15;
		
		// FUNCTION: main player object tick
		this.update = function() {		
			// kill player if off screen
			if (this.position.y > canvas.height*2 || this.position.x < 0 || this.position.x > canvas.width) {
				// delete this one
				projectiles.splice(projectiles.indexOf(this), 1);
			};
			
			// whether the projectile has collided with something
			var collided = false;
			var victim = {}; // stores who/what the projectile hit
			
			// check for collisions
			// loop through terrain objects
			for (var i = 0; i < terrains.length; ++i) {
				// get currently looped terrain object
				var currT = terrains[i];
				
				// update onGround variable by comparing pos to each terrain object
				if (this.position.x < currT.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.width > currT.position.x) {
					if (this.position.y + this.bounds.height > currT.position.y && this.position.y < currT.position.y + TERRAIN_HEIGHT && currT.isSolid()) {
						collided = true;
						victim = currT;
						break;
					}
				}
			};
			// loop through players for collisions if it's an enemy projectile
			var firstPlayer;
			if (players.length > 0)
				firstPlayer = players[0]; // variable where we will store front player
			else
				firstPlayer = {};
			for (var i = 0; i < players.length; ++i) {
				// only check living players
				if (players[i].deathTime == 0) {
					// get currently looped terrain object
					var p = players[i];
					
					// store first player in running order
					if (p.order < firstPlayer.order && players[i].deathTime == 0)
						firstPlayer = p;
					
					// only check player collisions if it's an enemy projectile
					if (this.enemyProj)
						// update collided variable by comparing pos to each terrain object
						if (this.position.x < p.position.x + p.bounds.width && this.position.x + this.bounds.width > p.position.x) {
							if (this.position.y + this.bounds.height > p.position.y && this.position.y < p.position.y + p.bounds.height) {
								collided = true;
								victim = p;
								break;
							}
						}
				}
			};
			// loop through enemies if it's a non-enemy projectile
			if (!this.enemyProj)
			for (var i = 0; i < enemies.length; ++i) {
				// get currently looped terrain object
				var e = enemies[i];
				
				// update onGround variable by comparing pos to each terrain object
				if (this.position.x < e.position.x + e.bounds.width && this.position.x + this.bounds.width > e.position.x) {
					if (this.position.y + this.bounds.height > e.position.y && this.position.y < e.position.y + e.bounds.height) {
						collided = true;
						victim = e;
						break;
					}
				}
			};
			
			// check if it has hit the player's shield, and bounce if so
			if (this.enemyProj && firstPlayer != undefined)
				for (var i = 0; i < players.length; ++i) {
					// thier shield is up
					if (players[i].qCooldown > 0 && players[i].classType === PLAYER_CLASSES.PALADIN && players[i].deathTime == 0)
						// check for collisions with the shield box
						if (this.position.x < firstPlayer.position.x + firstPlayer.bounds.width + 25 && this.position.x + this.bounds.width > firstPlayer.position.x) {
							// overlap detected
							if (this.position.y + this.bounds.height > players[i].position.y && this.position.y < players[i].position.y + players[i].bounds.height) {
								// bounce
								this.velocity.x *= -1;
								// now is a player projectile
								this.enemyProj = false;
							}
						}
				}
			
			// if off ground, update physics and check if on ground
			if (!collided) {		
				// update phsyics
				if (this.gravity)
					this.velocity.y += GRAVITY
				this.position.x += this.velocity.x;
				this.position.y += this.velocity.y;
			}
			else {
				victim.health -= this.projType.damage;
			
				// delete this one
				projectiles.splice(projectiles.indexOf(this), 1);
			};
				
			// DRAW: draw the projectile
			this.draw();
		};
	
		// FUCNTION: main player draw call
		this.draw = function() {
			ctx.save();
			ctx.drawImage(this.projType.img, this.position.x, this.position.y);
			ctx.restore();
		};
	};
	
	// CLASS: enemy object
	function Enemy(enemyType) {
		MobileObject.call(this);
		
		/* VARIABLES */
		this.enemyType = enemyType;		// what type of enemy this is
		this.maxJumps = 3;				// max number of jumps they can do in sequence
		this.color = this.enemyType.color; // color enemy will draw at if they have no image
		this.health = this.maxHealth = this.enemyType.health; // get health and max health of this enemy type
		this.bounds = {
			width: this.enemyType.width,
			height: this.enemyType.height
		};
		this.position = new Victor(		// starting enemy position
			canvas.width+25,
			canvas.height-TERRAIN_HEIGHT-this.bounds.height*2
		);
		this.targetPos = new Victor(	// the location the enemy is homing towards
			canvas.width - this.bounds.width*1.5,
			canvas.height-TERRAIN_HEIGHT-this.bounds.height
		);
		
		// FUNCTION: prints enemy information to console
		this.toString = function() {
			console.log("Enemy " + this.enemyType + " is at x" + this.position.toString());
		};
		
		// FUNCTION: main enemy object tick
		this.update = function() {
			// kill enemy if off screen or dead
			if (this.position.y > canvas.height*2 || this.health <= 0) {
				// award points equal to its starting health
				score += this.enemyType.health;
				
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
					if (this.position.y + this.bounds.height == currentTerrain.position.y && currentTerrain.isSolid() && this.velocity.y >= 0) {
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
							if (this.position.y + this.bounds.height + moveDist > currentTerrain.position.y && currentTerrain.isSolid()) {
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
			
			// attempt to shoot a projectile if anyone is alive
			if (rand(0, 15) < 0.1 && players.length > 0)
				projectiles.push(new Projectile(this.position.x, this.position.y, {position: {x: 0, y:this.position.y+this.bounds.height/2}}, PROJECTILE_TYPES.FIREBALL, true));
				
			// DRAW: draw the enemy
			this.draw();
		};
	
		// FUCNTION: main enemy draw call
		this.draw = function() {
			ctx.save();
			ctx.fillStyle = this.color;
			ctx.fillRect(this.position.x, this.position.y, this.bounds.width, this.bounds.height);
			
			// draw health above head
			ctx.fillStyle = "red";
			ctx.fillRect(this.position.x+10, this.position.y - 10, this.bounds.width-20, 5);
			ctx.fillStyle = "green";
			ctx.fillRect(this.position.x+10, this.position.y - 10, (this.bounds.width-20) * (this.health/this.maxHealth), 5);
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
				// only schedule jumps for living players
				if (players[i].deathTime == 0) {
					setTimeout(players[i].jump, players[i].order*jumpFunction(), 15, 1, false);
					globalLastTerrain = terrains[terrains.length-1];
				}
			};
			
			// prevent spacebar page scrolling
			e.preventDefault();
		};
		
		// q - make first player trigger Q ability
		if (e.keyCode == KEY.Q) {
			// loop players and only initiate ability on one at order 0
			for (var i = 0; i < players.length; ++i) {
				if (players[i].order == 0  && players[i].deathTime == 0)
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
				currentGameState = GAME_STATE.START;
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
		requestFullscreen: requestFullscreen,
		keyPress: keyPress,
		keyRelease: keyRelease
	};
}());