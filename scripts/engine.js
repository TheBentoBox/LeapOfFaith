// engine.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.engine = (function(){
	console.log("loaded engine.js module");
	
	/* VARIABLES */
	// SCREEN AND AUDIO VARIABLES //{
	var windowManager = game.windowManager; // reference to the engine's window manager
	var bgAudio;				// audio player reference for background audio
	var sfxPlayer;				// audio player reference for sound effects
	var canvas, ctx;			// canvas references
	var offCanvas, offCtx;		// offscreen canvas references
	var mouseX, mouseY;			// mouse coordinates
	var animationID;			// stores animation ID of animation frame
	var mouseDown = false;		// if the mouse is being held down
	var uiClicked = false;		// if UI was clicked
	var mouse = {};				// the mouse object
	var lastTime = (+new Date); // used with calculateDeltaTime
	var dt = 0;					// delta time
	var time = 0;
	//}
	
	//== ASSETS ==//{
		//== World ==//{
			var background = new Image();
		//== End World ==//}
		
		//== Player ==//{
			var paladinImg = new Image();
			var rangerImg = new Image();
			var magiImg = new Image();
		//== End Player ==//}
		
		//== Skills ==//{
			
		//== End Skills ==//}
	//== END UI ==//}
	
	// GAME VARIABLES //{
	// General
	var globalGameSpeed;		// current speed of the game, mainly used for faster terrain
	var GAME_STATE = {			// "enum" of the current status of the game
		START: 0,				// start screen
		RUNNING: 1,				// players are alive and running
		PAUSED: 2,				// the game is paused
		BETWEEN: 3,				// between levels on the buy screen
		DEAD: 4,				// entire party is dead
		HIGHSCORE: 5			// viewing the high score table
	};
	var currentGameState = GAME_STATE.START; // what is currently happening in the game
	var previousGameState = undefined; // set when paused, makes sure we return to right game state
	var currentLevel = 0;		// what level the player is on
	var currentLevelLength = 0;	// how long this level is (how many terrains will spawn)
	var keys = [];				// array to store pressed keys
	var experience = 0;			// increases like score, but can be spent for upgrades
	var score = 0;				// current score, = number of terrain objects passed
	var highScores = [];		// array of high scores when they're loaded in
	
	// Terrain
	var currentTerrainType;		// current type of floor object being generated
	var terrainCount;			// number of terrain type to be generated before switching
	var TERRAIN_WIDTH = 100;	// width of each terrain object, think of it like "block width"
	var TERRAIN_HEIGHT = 100;	// height of each terrain object, how high from the bottom it goes
	var terrains = [];			// array to hold terrain objects
	var TERRAIN_TYPES = {		// "enum" of terrain types
		BASE: {
			isSolid: true,
			img: new Image()
		},
		VOID: {
			isSolid: false,
			img: new Image()
		},
		LAVA: {
			isSolid: false,
			img: new Image()
		},
		randomDangerous: function() {
			if (Math.random() < 0.5)
				return TERRAIN_TYPES.VOID;
			return TERRAIN_TYPES.LAVA;
		}
	};
	
	// Players
	var players = [];			// array that holds all 3 players
	var paladin = {};			// direct reference to the paladin
	var ranger = {};			// direct reference to the ranger
	var magi = {};				// direct reference to the magi
	var leader = {};			// reference to the current party leader
	
	// Player classes
	var PLAYER_CLASSES = {		// enum storing class info
		PALADIN: {
			name: "Paladin",
			health: 125,
			img: new Image(),
			shield: new Image(),
			width: 65,
			height: 150,
			qDur: 250,
			qCool: 450,
			qSnd: "shield.mp3",
			wDur: 18,
			wCool: 400,
			wSnd: "whoosh.mp3",
			eDur: 0,
			eCool: 2000,
			eSnd: "heal.mp3"
		},
		RANGER: {
			name: "Ranger",
			health: 75,
			img: new Image(),
			width: 65,
			height: 145,
			qDur: 0,
			qCool: 15,
			qSnd: "arrow.mp3",
			wDur: 0,
			wCool: 300,
			wSnd: "whoosh.mp3",
			eDur: 0,
			eCool: 420,
			eSnd: "grenadeLob.mp3"
		},
		MAGI: {
			name: "Magi",
			health: 100,
			img: new Image(),
			width: 65,
			height: 130,
			qDur: 0,
			qCool: 60,
			qSnd: "fireball.mp3",
			wDur: 20,
			wCool: 800,
			wSnd: "iceBridge.mp3",
			eDur: 180,
			eCool: 950,
			eSnd: "stun.mp3"
		}
	};
	
	// Enemies
	var enemies = [];
	var ENEMY_TYPES = {
		GATOR: {
			name: "Gator",
			health: 75,
			img: new Image(),
			width: 100,
			height: 60,
			AI: "running"
		},
		RAT: {
			name: "Rat",
			health: 55,
			img: new Image(),
			width: 100,
			height: 50,
			AI: "standing"
		},
		BAT: {
			name: "Bat",
			health: 50,
			img: new Image(),
			width: 85,
			height: 50,
			AI: "flying"
		}
	};
	
	// Projectiles
	var projectiles = [];
	var PROJECTILE_TYPES = {
		ARROW: {
			strength: function() { return 3 + ranger.abilities.Q.level; },
			img: new Image(),
			width: 45,
			height: 13,
			gravity: true,
			velocity: 33
		},
		GRENADE: {
			strength: function() { return 30 + ranger.abilities.E.level*5; },
			img: new Image(),
			width: 40,
			height: 40,
			gravity: true,
			velocity: 15
		},
		MAGIFIREBALL: {
			strength: function() { return 5 + magi.abilities.Q.level*2; },
			img: new Image(),
			postProcess: true,
			width: 40,
			height: 40,
			gravity: false,
			velocity: 25
		},
		POISONBOLT: {
			strength: function() { return Math.min(15, 5 + currentLevel);},
			img: new Image(),
			width: 30,
			height: 30,
			gravity: true,
			velocity: 35
		}
	};
	
	// Particle Systems
	var particleSystems = [];
	var particles = [];
	var PARTICLE_TYPES = {		// enum storing particle type info
		FLAME: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-1, 1)); },
			img: new Image()
		},
		ICE: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(rand(10, 30), rand(-10, -30)); },
			img: new Image()
		},
		FROST: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(-globalGameSpeed + rand(-0.5, 0.5), rand(-0.5, 0.5)); },
			img: new Image()
		},		
		STUN: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-0.5, 0.5), rand(-0.5, 0.5)); },
			img: new Image()
		},
		HEAL: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-0.5, 0.5), -5); },
			img: new Image()
		}
	}
	
	//== Light Sources
	var lightSources = [];
	
	var postProcesses = [];
	//}
	
	// PHYSICS VARIABLES //{
	var GRAVITY = 60;			// global gravity - this*dt added to velocity.y
	var jumpFunction = function() { return 1000/60*TERRAIN_WIDTH/globalGameSpeed; };
	var globalLastTerrain = {};
	var newUI = undefined;
	var inControl = function() { return currentGameState === GAME_STATE.RUNNING; };
	//}

	//== Array Safe Splice
	// Doesn't splice the last index if -1 is passed as index
	// Has better compatibility with indexOf, which returns -1 if the objec isn't found
	Array.prototype.safeSplice = function (index, amount) {
		if (index >= 0)
			this.splice(index, amount);
	}
	
	
	
	// Set up canvas and game variables
	function init() {
		// SETUP: canvas and audio
		// canvas
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext("2d")
		offCanvas = document.createElement('canvas');
		offCanvas.width = canvas.width;
		offCanvas.height = canvas.height;
		offCtx = offCanvas.getContext("2d");
		
		// get reference to audio element
		bgAudio = document.querySelector('#bgAudio');
		
		// load default song and title, and play
		//playStream(sfxPlayer);
		loadAssets();
		
		// taps working as jumps 
		canvas.addEventListener("mousedown", function(e) {
			mouseDown = true;
			e.preventDefault();
			
			// check for mouse presses on the UI
			uiClicked = game.windowManager.checkMouse(e);
			
			// run game actions if the UI was not clicked
			if(!uiClicked){
				// Switch party order on clicks
				// loop and cycle if they aren't running already
				if (currentGameState === GAME_STATE.RUNNING) {
					if (e.which === 1) {
						cycleParty(1);
					}
					else if (e.which === 3) {
						cycleParty(-1);
					}
				};
				
				// if the player has died
				if (currentGameState === GAME_STATE.DEAD) {
					// restart the game
					setupGame();
				};
			}
		}.bind(this));
		// compatibility for touch devices
		canvas.addEventListener("touchstart", function(e) { 
			mouseDown = true;
			e.preventDefault();
			
			// check for mouse presses on the UI
			uiClicked = game.windowManager.checkMouse(e);
			
			// run game actions if the UI was not clicked
			if(!uiClicked){
				// if the game is running (player is alive)
				if (currentGameState === GAME_STATE.RUNNING) {
					for (var i = 0; i < players.length; ++i) {
						// loop players and jump after a delay based on party order
						setTimeout(players[i].jump, i*jumpFunction(), 15, 1);
					};
				};
				// if the player has died
				if (currentGameState === GAME_STATE.DEAD) {
					// restart the game
					setupGame();
				};
			}
		}.bind(this));
		// track mouse position
		canvas.addEventListener("mousemove", function(e) { mouse = getMouse(e) });
		// taps working as jumps
		canvas.addEventListener("mouseup", function(e) { mouseDown = false; });
		canvas.addEventListener("touchend", function(e) { mouseDown = false; });
		
		// callback for button presses
		window.addEventListener("keydown", keyPress);
		// callback for button presses
		window.addEventListener("keyup", keyRelease);
		
		//== BUILD UI ELEMENTS ==//{
			//== Main Menu ==//{
				windowManager.makeUI("titleScreen", 0, 0, canvas.width, canvas.height);
				var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
				grad.addColorStop(0, "#ddce8f");
				grad.addColorStop(1, "#6E643B");
				windowManager.modifyUI("titleScreen", "fill", {color: grad});
				
				// game title
				windowManager.makeText("titleScreen", "title", 50, 50, canvas.width, "default", "Leap of Faith", "40pt 'Uncial Antiqua'", "#666044");
				windowManager.toggleUI("titleScreen");
				
				// start game button
				windowManager.makeButton("titleScreen", "startButton", 60, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {game.engine.setupGame();});
				windowManager.modifyButton("titleScreen", "startButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("titleScreen", "startButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("titleScreen", "startButton", "text", {string: "Start", css: "24pt 'Uncial Antiqua'", color: "#b7a86d"});
				
				// instructions button
				windowManager.makeButton("titleScreen", "instructionButton", 250, 5*canvas.height/6, canvas.width/5, canvas.height/12, function() {windowManager.toggleUI("titleScreen"); windowManager.toggleUI("instructionScreen");});
				windowManager.modifyButton("titleScreen", "instructionButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("titleScreen", "instructionButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("titleScreen", "instructionButton", "text", {string: "Instructions", css: "24pt 'Uncial Antiqua'", color: "#b7a86d"});
				
				// credits button
				windowManager.makeButton("titleScreen", "creditButton", 540, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {windowManager.toggleUI("titleScreen"); windowManager.toggleUI("creditScreen");});
				windowManager.modifyButton("titleScreen", "creditButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("titleScreen", "creditButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("titleScreen", "creditButton", "text", {string: "Credits", css: "24pt 'Uncial Antiqua'", color: "#b7a86d"});
			//== End Menu ==//}
			
			//== Instruction Screen ==//{
				windowManager.makeUI("instructionScreen", 0, 0, canvas.width, canvas.height);
				windowManager.modifyUI("instructionScreen", "fill", {color: grad});
				windowManager.activateUIPausing("instructionScreen");
				
				// instruction text
				windowManager.makeText("instructionScreen", "title", 50, 50, "default", "default", "Instructions", "40pt 'Uncial Antiqua'", "#666044");
				windowManager.makeText("instructionScreen", "instructions", 65, 130, canvas.width - 50, "default", 
					"LMB/RMB:     Cycle party members%n" +
					"Left/Right:  Cycle party members%n" +
					"Space:       Jump/Double-jump%n" +
					"Q/W/E        Activate abilities%n" +
					"Party members regenerate health and respawn over time.%n" +
					"Earn experience by surviving and killing enemies.%n" +
					"Upgrade your party members between levels.%n", 
					"20pt 'Uncial Antiqua'", "#666044"
				);
				windowManager.modifyText("instructionScreen", "instructions", "padding", {top: 0, right: 0, bottom: 0, left: 0, line: 20});
				
				// back button
				windowManager.makeButton("instructionScreen", "backButton", canvas.width * 7/8 - 50, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {windowManager.toggleUI("instructionScreen"); windowManager.toggleUI("titleScreen");});
				windowManager.modifyButton("instructionScreen", "backButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("instructionScreen", "backButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("instructionScreen", "backButton", "text", {string: "Back", css: "24pt 'Uncial Antiqua'", color: "#b7a86d"});
			//== End Instructions ==//}
				
			//== Credit Screen ==//{
				windowManager.makeUI("creditScreen", 0, 0, canvas.width, canvas.height);
				windowManager.modifyUI("creditScreen", "fill", {color: grad});
				windowManager.activateUIPausing("creditScreen");
				
				// instruction text
				windowManager.makeText("creditScreen", "title", 50, 50, "default", "default", "Credits", "40pt 'Uncial Antiqua'", "#666044");
				windowManager.makeText("creditScreen", "credits", 65, 130, canvas.width - 50, "default", 
					"Engine:        Jake Ben-Tovim%n" +
					"Interface:     Joe Kapusta%n" +
					"Art:           Michelle Leadley%n" +
					"Design:        Austin White%n", 
					"24pt 'Uncial Antiqua'", "#666044"
				);
				windowManager.modifyText("creditScreen", "credits", "padding", {top: 0, right: 0, bottom: 0, left: 0, line: 20});
				
				// back button
				windowManager.makeButton("creditScreen", "backButton", canvas.width * 7/8 - 50, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {windowManager.toggleUI("creditScreen"); windowManager.toggleUI("titleScreen");});
				windowManager.modifyButton("creditScreen", "backButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("creditScreen", "backButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("creditScreen", "backButton", "text", {string: "Back", css: "24pt 'Uncial Antiqua'", color: "#b7a86d"});
			//== End Credits ==//}
			
			//== Pause Screen ==//{
				windowManager.makeUI("pauseScreen", canvas.width/3, canvas.height/3, canvas.width/3, canvas.height/3);
				windowManager.modifyUI("pauseScreen", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("pauseScreen", "border", {color: "#b7a86d", width: 6});
				windowManager.activateUIPausing("pauseScreen");
				windowManager.makeText("pauseScreen", "pause", 20, 20, "default", "default", "Paused", "30pt 'Uncial Antiqua'", "#b7a86d");
				
				// continue button
				windowManager.makeButton("pauseScreen", "continueButton", 20, 80, canvas.width/3 - 40, canvas.height/12, function() {game.engine.resumeGame();});
				windowManager.modifyButton("pauseScreen", "continueButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("pauseScreen", "continueButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("pauseScreen", "continueButton", "text", {string: "Continue", css: "20pt 'Uncial Antiqua'", color: "#b7a86d"});
				
				// quit button
				windowManager.makeButton("pauseScreen", "quitButton", 20, 160, canvas.width/3 - 40, canvas.height/12, function() {
					windowManager.deactivateUI("all");
					windowManager.activateUI("titleScreen");
					currentGameState = GAME_STATE.START;
				});
				windowManager.modifyButton("pauseScreen", "quitButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("pauseScreen", "quitButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("pauseScreen", "quitButton", "text", {string: "Quit", css: "20pt 'Uncial Antiqua'", color: "#b7a86d"}); 
			//== End Pause ==//}
			
			//== Death Screen ==//{
				windowManager.makeUI("deathScreen", canvas.width/3, canvas.height/3, canvas.width/3, canvas.height/3);
				windowManager.modifyUI("deathScreen", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("deathScreen", "border", {color: "#b7a86d", width: 6});
				windowManager.activateUIPausing("deathScreen");
				windowManager.makeText("deathScreen", "dead", 20, 20, canvas.width / 3 - 40, "default", "You died...", "30pt 'Uncial Antiqua'", "#b7a86d");
				
				// new game button
				windowManager.makeButton("deathScreen", "restartButton", 20, 80, canvas.width/3 - 40, canvas.height/12, function() {windowManager.deactivateUI("deathScreen"); game.engine.setupGame();});
				windowManager.modifyButton("deathScreen", "restartButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("deathScreen", "restartButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("deathScreen", "restartButton", "text", {string: "New game", css: "20pt 'Uncial Antiqua'", color: "#b7a86d"});
				
				// quit button
				windowManager.makeButton("deathScreen", "quitButton", 20, 160, canvas.width/3 - 40, canvas.height/12, function() {
					windowManager.deactivateUI("all");
					windowManager.activateUI("titleScreen");
					currentGameState = GAME_STATE.START;
				});
				windowManager.modifyButton("deathScreen", "quitButton", "fill", {color: "#ddce8f"});
				windowManager.modifyButton("deathScreen", "quitButton", "border", {color: "#b7a86d", width: 4});
				windowManager.modifyButton("deathScreen", "quitButton", "text", {string: "Quit", css: "20pt 'Uncial Antiqua'", color: "#b7a86d"}); 
			//== End Death ==//}
			
			//== Ability UI ==//{
				// HUD box for current abilities
				windowManager.makeUI("abilityHUD", 0, canvas.height*6/7, canvas.width*0.19, canvas.height/7);
				
				// set ability box to sandstone colors
				windowManager.modifyUI("abilityHUD", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("abilityHUD", "border", {color: "#b7a86d", width: 3});
				
				//== Ability Buttons ==//
				//ability 1
				windowManager.makeButton("abilityHUD", "qButton", 10, 10, 64, 64, function(){game.engine.keyPress({keyCode: KEY.Q, simulated: true});});
				windowManager.modifyButton("abilityHUD", "qButton", "fill", {color: "#30d0ff"});
				windowManager.modifyButton("abilityHUD", "qButton", "border", {color: "#0b85a8", width: 2});
				windowManager.modifyButton("abilityHUD", "qButton", "text", {string: "Q", css: "20pt 'Uncial Antiqua'", color: "#0b85a8"});
				
				// ability 2
				windowManager.makeButton("abilityHUD", "wButton", 84, 10, 64, 64, function() {game.engine.keyPress({keyCode: KEY.W, simulated: true});});
				windowManager.modifyButton("abilityHUD", "wButton", "fill", {color: "#30d0ff"});
				windowManager.modifyButton("abilityHUD", "wButton", "border", {color: "#0b85a8", width: 2});
				windowManager.modifyButton("abilityHUD", "wButton", "text", {string: "W", css: "20pt 'Uncial Antiqua'", color: "#0b85a8"});
				
				// ability 3
				windowManager.makeButton("abilityHUD", "eButton", 158, 10, 64, 64, function(eKey){game.engine.keyPress({keyCode: KEY.E, simulated: true});});
				windowManager.modifyButton("abilityHUD", "eButton", "fill", {color: "#30d0ff"});
				windowManager.modifyButton("abilityHUD", "eButton", "border", {color: "#0b85a8", width: 2});
				windowManager.modifyButton("abilityHUD", "eButton", "text", {string: "E", css: "20pt 'Uncial Antiqua'", color: "#0b85a8"});
			
				//== Cooldown Bars ==//
				// ability 1
				windowManager.makeBar("abilityHUD", "qBar", 10, 80, 64, 10, 1, 1, 0);
				windowManager.modifyBar("abilityHUD", "qBar", "fill", {foreColor: "#376573", backColor: "#30d0ff"});
				windowManager.modifyBar("abilityHUD", "qBar", "border", {color: "#0b85a8", width: "1"});
				
				// ability 2
				windowManager.makeBar("abilityHUD", "wBar", 84, 80, 64, 10, 1, 1, 0);
				windowManager.modifyBar("abilityHUD", "wBar", "fill", {foreColor: "#376573", backColor: "#30d0ff"});
				windowManager.modifyBar("abilityHUD", "wBar", "border", {color: "#0b85a8", width: "1"});
				
				// ability 3
				windowManager.makeBar("abilityHUD", "eBar", 158, 80, 64, 10, 1, 1, 0);
				windowManager.modifyBar("abilityHUD", "eBar", "fill", {foreColor: "#376573", backColor: "#30d0ff"});
				windowManager.modifyBar("abilityHUD", "eBar", "border", {color: "#0b85a8", width: "1"});
			//== End Abilities ==//}
			
			//== Experience UI ==//{
				windowManager.makeUI("expHUD", canvas.width*3/4, 0, canvas.width/4, 50);
				
				// set fill color
				windowManager.modifyUI("expHUD", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("expHUD", "border", {color: "#b7a86d", width: 3});
				
				// experience text
				windowManager.makeText("expHUD", "experience", 10, 10, canvas.width/4, 30, "Experience: %v", "20pt 'Uncial Antiqua'", "#666044");
			//== End Experience ==//}
			
			//== Player UI ==//{
				windowManager.makeUI("playerHUD", 0, 0, canvas.width*0.21, canvas.height*0.24);
				
				// set colors
				windowManager.modifyUI("playerHUD", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("playerHUD", "border", {color: "#b7a86d", width: 3});
				
				//== Player Images ==//
				// paladin
				windowManager.makeImage("playerHUD", "paladinImg", 5, 5, 50, 50, paladinImg);
				windowManager.modifyImage("playerHUD", "paladinImg", "fill", {color: "#666044"});
				windowManager.modifyImage("playerHUD", "paladinImg", "border", {color: "#b7a86d", width: 2});
				
				// ranger
				windowManager.makeImage("playerHUD", "rangerImg", 5, 60, 50, 50, rangerImg);
				windowManager.modifyImage("playerHUD", "rangerImg", "fill", {color: "#666044"});
				windowManager.modifyImage("playerHUD", "rangerImg", "border", {color: "#b7a86d", width: 2});
				
				// magi
				windowManager.makeImage("playerHUD", "magiImg", 5, 115, 50, 50, magiImg);
				windowManager.modifyImage("playerHUD", "magiImg", "fill", {color: "#666044"});
				windowManager.modifyImage("playerHUD", "magiImg", "border", {color: "#b7a86d", width: 2});
				
				//== Health Bars ==//
				// paladin
				windowManager.makeBar("playerHUD", "paladinHealth", 60, 23, 200, 20, PLAYER_CLASSES.PALADIN.health, PLAYER_CLASSES.PALADIN.health, 0);
				windowManager.modifyBar("playerHUD", "paladinHealth", "fill", {foreColor: "#080", backColor: "#800"});
				windowManager.modifyBar("playerHUD", "paladinHealth", "border", {color: "#b7a86d", width: 2});
				
				// ranger
				windowManager.makeBar("playerHUD", "rangerHealth", 60, 78, 200, 20, PLAYER_CLASSES.RANGER.health, PLAYER_CLASSES.RANGER.health, 0);
				windowManager.modifyBar("playerHUD", "rangerHealth", "fill", {foreColor: "#080", backColor: "#800"});
				windowManager.modifyBar("playerHUD", "rangerHealth", "border", {color: "#b7a86d", width: 2});
				
				// magi
				windowManager.makeBar("playerHUD", "magiHealth", 60, 133, 200, 20, PLAYER_CLASSES.MAGI.health, PLAYER_CLASSES.MAGI.health, 0);
				windowManager.modifyBar("playerHUD", "magiHealth", "fill", {foreColor: "#080", backColor: "#800"});
				windowManager.modifyBar("playerHUD", "magiHealth", "border", {color: "#b7a86d", width: 2});
			//== End Player ==//}
			
			//== Upgrade Shop UI ==//{
				windowManager.makeUI("shopScreen", canvas.width/4, canvas.height/8, canvas.width/2, canvas.height*.73);
				windowManager.modifyUI("shopScreen", "fill", {color: "#ddce8f"});
				windowManager.modifyUI("shopScreen", "border", {color: "#b7a86d", width: 4});
				
				// level complete text
				windowManager.makeText("shopScreen", "levelComplete", 20, 20, canvas.width/2, "default", "Level complete!", "18pt 'Uncial Antiqua'", "#666044");
				
				// experience text
				windowManager.makeText("shopScreen", "shopExp", canvas.width*.22, 25, canvas.width/2, "default", "Experience: 0", "14pt 'Uncial Antiqua'", "#666044");
				
				// next level button
				windowManager.makeButton("shopScreen", "nextLevel", canvas.width*.5 - 140, 20, 110, 30, game.engine.setupLevel);
				windowManager.modifyButton("shopScreen", "nextLevel", "fill", {color: "#30d0ff"});
				windowManager.modifyButton("shopScreen", "nextLevel", "border", {color: "#0b85a8", width: 2});
				windowManager.modifyButton("shopScreen", "nextLevel", "text", {string: "Next Level", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
				
				//== Player Ability Upgrades ==//{
					//== Paladin ==//{
						// Q
						windowManager.makeText("shopScreen", "paladinQText", 20, 80, canvas.width*.25, "default", 
							"Shield%n" +
							"Duration: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "paladinQText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "paladinQButton", 20, 180, 100, 30, function() {game.engine.paladin.abilities.Q.levelUp();});
						windowManager.modifyButton("shopScreen", "paladinQButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "paladinQButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "paladinQButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// W
						windowManager.makeText("shopScreen", "paladinWText", 20, 220, canvas.width*.25, "default", 
							"Dash%n" +
							"Duration: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "paladinWText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "paladinWButton", 20, 320, 100, 30, function() {game.engine.paladin.abilities.W.levelUp();});
						windowManager.modifyButton("shopScreen", "paladinWButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "paladinWButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "paladinWButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// E
						windowManager.makeText("shopScreen", "paladinEText", 20, 360, canvas.width*.25, "default", 
							"Heal%n" +
							"Duration: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "paladinEText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "paladinEButton", 20, 460, 100, 30, function() {game.engine.paladin.abilities.E.levelUp();});
						windowManager.modifyButton("shopScreen", "paladinEButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "paladinEButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "paladinEButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
					//== End Paladin ==//}
					
					//== Ranger ==//{
						// Q
						windowManager.makeText("shopScreen", "rangerQText", canvas.width*.19, 80, canvas.width*.25, "default", 
							"Arrow%n" +
							"Damage: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "rangerQText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "rangerQButton", canvas.width*.19, 180, 100, 30, function() {game.engine.ranger.abilities.Q.levelUp();});
						windowManager.modifyButton("shopScreen", "rangerQButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "rangerQButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "rangerQButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// W
						windowManager.makeText("shopScreen", "rangerWText", canvas.width*.19, 220, canvas.width*.25, "default", 
							"Jump%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "rangerWText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "rangerWButton", canvas.width*.19, 320, 100, 30, function() {game.engine.ranger.abilities.W.levelUp();});
						windowManager.modifyButton("shopScreen", "rangerWButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "rangerWButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "rangerWButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// E
						windowManager.makeText("shopScreen", "rangerEText", canvas.width*.19, 360, canvas.width*.25, "default", 
							"Grenade%n" +
							"Damage: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "rangerEText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "rangerEButton", canvas.width*.19, 460, 100, 30, function() {game.engine.ranger.abilities.E.levelUp();});
						windowManager.modifyButton("shopScreen", "rangerEButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "rangerEButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "rangerEButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
					//== End Ranger ==//}
					
					//== Magi ==//{
						// Q
						windowManager.makeText("shopScreen", "magiQText", canvas.width*.37, 80, canvas.width*.25, "default", 
							"Fireball%n" +
							"Damage: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "magiQText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "magiQButton", canvas.width*.37, 180, 100, 30, function() {game.engine.magi.abilities.Q.levelUp();});
						windowManager.modifyButton("shopScreen", "magiQButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "magiQButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "magiQButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// W
						windowManager.makeText("shopScreen", "magiWText", canvas.width*.37, 220, canvas.width*.25, "default", 
							"Ice Bridge%n" +
							"Duration: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "magiWText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "magiWButton", canvas.width*.37, 320, 100, 30, function() {game.engine.magi.abilities.W.levelUp();});
						windowManager.modifyButton("shopScreen", "magiWButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "magiWButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "magiWButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
						
						// E
						windowManager.makeText("shopScreen", "magiEText", canvas.width*.37, 360, canvas.width*.25, "default", 
							"Stun%n" +
							"Duration: 0%n" +
							"Cooldown: 0%n" +
							"Cost: 0%n",
							"14pt 'Uncial Antiqua'", "#666044"
						);
						windowManager.modifyText("shopScreen", "magiEText", "padding", {top: 5, right: 0, bottom: 0, left: 5, line: 5});
						
						windowManager.makeButton("shopScreen", "magiEButton", canvas.width*.37, 460, 100, 30, function() {game.engine.magi.abilities.E.levelUp();});
						windowManager.modifyButton("shopScreen", "magiEButton", "fill", {color: "#30d0ff"});
						windowManager.modifyButton("shopScreen", "magiEButton", "border", {color: "#0b85a8", width: 2});
						windowManager.modifyButton("shopScreen", "magiEButton", "text", {string: "Upgrade", css: "12pt 'Uncial Antiqua'", color: "#0b85a8"});
					//== End Magi ==//}
				//== End Abilities ==//}
			//== End Shop ==//}
		//== END UI ==//}
		
		// BEGIN main game tick
		loop();
	};
	
	// Setup a new game
	function setupGame() {
		// reset variables
		score = 0;
		experience = 10000;
		currentLevel = 0;
		currentGameState = GAME_STATE.RUNNING;
		
		// deactivate menu
		windowManager.deactivateUI("titleScreen");
		
		// SETUP: game
		// create the players
		players = [];
		players[0] = paladin = leader = new Player(PLAYER_CLASSES.PALADIN);
		players[1] = ranger = new Player(PLAYER_CLASSES.RANGER);
		players[2] = magi = new Player(PLAYER_CLASSES.MAGI);
		
		// update ability HUD
		windowManager.modifyBar("abilityHUD", "qBar", "target", {tgtVar: leader.abilities.Q.cooldown, tgtMax: leader.abilities.Q.maxCool, tgtMin: 0});
		windowManager.modifyBar("abilityHUD", "wBar", "target", {tgtVar: leader.abilities.W.cooldown, tgtMax: leader.abilities.W.maxCool, tgtMin: 0});
		windowManager.modifyBar("abilityHUD", "eBar", "target", {tgtVar: leader.abilities.E.cooldown, tgtMax: leader.abilities.E.maxCool, tgtMin: 0});
		
		// prepare the level
		setupLevel();
		
		// start music loop
		bgAudio.currentTime = 0;
		bgAudio.play();
		
		// show HUD
		activateHUD();
	};
	
	// Setup the next level
	function setupLevel() {
		// level number and properties
		++currentLevel;
		currentLevelLength = 1// + currentLevel*25;
		
		//== Reset entities ==//
		particles = [];
		particleSystems = [];
		projectiles = [];
		lightSources = [];
		
		//== Prepare Terrain ==//
		// reset terrains
		terrains = [];
		globalGameSpeed = Math.min(16, 7+currentLevel);
		
		// generate initial terrain
		currentTerrainType = TERRAIN_TYPES.BASE;
		for (var i = 0; i < Math.floor(canvas.width*1.5/TERRAIN_WIDTH); ++i) {
			terrains[i] = new Terrain(i*TERRAIN_WIDTH);
		}
		
		// set up first dangerous tiles
		currentTerrainType = TERRAIN_TYPES.randomDangerous();
		terrainCount = 2;
		
		//== Starting Enemy ==//
		if (enemies.length === 0)
			enemies.push(new Enemy(ENEMY_TYPES.GATOR));
		
		// Disable HUD and begin running!
		windowManager.deactivateUI("shopScreen");
		activateHUD();
		currentGameState = GAME_STATE.RUNNING;
	};
	
	// Load game assets (images and sounds)
	function loadAssets() {
		// world
		background.src = "assets/Wall720.png";
		TERRAIN_TYPES.BASE.img.src = "assets/TileSandstone100.png";
		TERRAIN_TYPES.LAVA.img.src = "assets/lava.png";
		
		// player
		paladinImg.src = "assets/paladinImg.png";
		rangerImg.src = "assets/rangerImg.png";
		magiImg.src = "assets/magiImg.png";
		
		PLAYER_CLASSES.PALADIN.img.src = "assets/paladinRun.png";
		PLAYER_CLASSES.PALADIN.shield.src = "assets/shield.png";
		PLAYER_CLASSES.RANGER.img.src = "assets/rangerRun.png";
		PLAYER_CLASSES.MAGI.img.src = "assets/magiRun.png";
		
		ENEMY_TYPES.RAT.img.src = "assets/ratRun.png";
		ENEMY_TYPES.BAT.img.src = "assets/batRun.png";
		ENEMY_TYPES.GATOR.img.src = "assets/gatorRun.png";
		
		PROJECTILE_TYPES.ARROW.img.src = "assets/arrow.png";
		PROJECTILE_TYPES.GRENADE.img.src = "assets/grenade.png";
		PROJECTILE_TYPES.MAGIFIREBALL.img.src = "assets/fireball.png";
		PROJECTILE_TYPES.POISONBOLT.img.src = "assets/poisonBolt.png";
		
		PARTICLE_TYPES.FLAME.img.src = "assets/flameParticle.png";
		PARTICLE_TYPES.ICE.img.src = PARTICLE_TYPES.FROST.img.src = "assets/iceParticle.png";
		PARTICLE_TYPES.HEAL.img.src = "assets/healParticle.png";
		PARTICLE_TYPES.STUN.img.src = "assets/stunParticle.png";
	};
	
	// play a sound effect
	function playStream(source, vol) {
		var player = new Audio("assets/" + source);
		player.volume = vol;
		player.play();
	};
	
	// main loop - always runs
	function loop() {
		animationID = requestAnimationFrame(loop);
		
		if (currentGameState === GAME_STATE.RUNNING || currentGameState === GAME_STATE.BETWEEN)
			update();
		
		// draw UI with all relevant data
		// game HUD
		if (currentGameState === GAME_STATE.RUNNING) {
			windowManager.updateAndDraw([
				{name:"experience", value:[experience]},
				{name:"paladinHealth", value: [paladin.health]},
				{name:"rangerHealth", value: [ranger.health]},
				{name:"magiHealth", value: [magi.health]},
				{name:"qBar", value: [leader.abilities.Q.cooldown]},
				{name:"wBar", value: [leader.abilities.W.cooldown]},
				{name:"eBar", value: [leader.abilities.E.cooldown]}
			]);
		}
		else {
			windowManager.updateAndDraw([]);
		}
	}
	
	// main game tick
	function update() {
		// reset/calculate control variables
		dt = calculateDeltaTime();
		postProcesses = [];
		++time;
		
		// draw high score screen
		if (currentGameState === GAME_STATE.HIGHSCORE) {
			ctx.fillStyle = "rgb(20, 20, 20)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "High Scores", canvas.width/2, 100, "30pt 'Uncial Antiqua'", "white");
			fillText(ctx, "Press H to return to the main menu", canvas.width/2, 135, "18pt Calibri", "white");
			
			// only draw high scores if localStorage is available
			if (typeof(window.localStorage) != undefined) {
				// loop through scores
				for (var i = 0; i < 10; ++i)
					// draw 0 in place of null scores
					if (highScores[i] === "null")
						fillText(ctx, (i+1) + ". 0", canvas.width/2, 200 + i*40, "20pt Calibri", "white");
					else
						fillText(ctx, (i+1) + ". " + highScores[i], canvas.width/2, 200 + i*40, "20pt Calibri", "white");
			}
			// otherwise, draw an error message
			else {
				fillText(ctx, "Your system does not support high score storage", canvas.width/2, canvas.height/2, "18pt Calibri", "white");
			}
			return;
		};
		
		// push to between screen if the level is finished
		if (currentLevelLength <= 0 && currentGameState != GAME_STATE.BETWEEN) {
			// check if there's any dangerous terrains left on screen
			var stillDangerous = false;
			for (var i = 0; i < terrains.length; ++i)
				if (terrains[i].terrainType != TERRAIN_TYPES.BASE) {
					stillDangerous = true;
					break;
				}
			
			// only go to between level state once the dangerous has passed
			if (!stillDangerous) {
				// set to between state
				currentGameState = GAME_STATE.BETWEEN;
				
				// deactivate HUDs
				deactivateHUD();
				
				// enable upgrade screen UI
				upgrade();
				
				// reset player abilities
				for (var i = 0; i < players.length; ++i)
					players[i].abilities.reset();
			}
		}
				
		//=== MAIN UPDATE & DRAW ===//
		// Clear both canvases
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
		offCtx.globalCompositeOperation = "source-over";
		
		// Switch party order with left or right arrow keys
		// loop and cycle if they aren't switching already
		if (currentGameState === GAME_STATE.RUNNING) {
			if (keys[KEY.LEFT])
				cycleParty(1);
			else if (keys[KEY.RIGHT])
				cycleParty(-1);
		};
		
		// Draw the parallax background
		for (var i = -(time*3 % background.width); i < canvas.width; i += background.width) {
			ctx.drawImage(background, i, 0);
		}
		
		//== UPDATE ALL OBJECTS //{
		// update players
		var numDead = 0;
		for (var i = 0; i < players.length; ++i) {
			// if player is alive, attempt an update
			if (players[i].deathTime <= 0) {
				// only actually update if player is in control or they're off the ground, or respawning
				// we also update if they're off the ground so they don't freeze midair between levels
				if (inControl() || !players[i].onGround || players[i].deathTime < 0) {
					players[i].update();
				}
				// otherwise, just do the draw
				else {
					players[i].draw();
				}
			}
				
			// if they're dead, increment death counter and respawn if it's been long enough
			else if (currentGameState === GAME_STATE.RUNNING) {
				++numDead;
				++players[i].deathTime;
				// respawn
				if (players[i].deathTime >= 1200) {
					// get number of living players
					var numAlive = 0;
					for (var ii = 0; ii < players.length; ++ii) {
						if (players[ii].deathTime <= 0) {
							++numAlive;
						}
					}
							
					// Update player's variables to prepare for respawning
					players[i].deathTime = -1;
					players[i].health = players[i].maxHealth/2;
					players[i].order = numAlive;
					players[i].setPosition(275 - players[i].order*100, -players[i].classType.img.height);
					players[i].onGround = false;
					
					// Create a burst of light to indicate their respawn
					var light = new LightSource(players[i], 350, -1, false, 1);
					light.root = "dying";
					lightSources.push(light);
					
					// Play respawn noise
					playStream("respawn.mp3", 0.25);
				}
			}
		}
		
		// if everyone is dead, send game to death screen
		if (numDead === players.length && currentGameState != GAME_STATE.DEAD) {
			players = [];
			currentGameState = GAME_STATE.DEAD;
			windowManager.activateUI("deathScreen");
			deactivateHUD();
			
			// attempt to add the score to the high score list
			if (typeof(window.localStore) != undefined) {
				// loop through stored scores
				for (var i = 0; i < 10; ++i) {
					// get the stored score
					var value = window.localStorage.getItem("score"+i);
					
					// if no score is there yet, put this one there
					if (value === null) {
						window.localStorage.setItem("score"+i, score);
						return;
					}
					
					// if this score is higher than that one, put this one in and push the rest down
					if (score > value) {
						// push rest down
						for (var ii = 9; ii > i; --ii) {
							window.localStorage.setItem("score"+ii, window.localStorage.getItem("score"+(ii-1)));
						}
						// put this one here
						window.localStorage.setItem("score"+i, score);
						return;
					}
				}
			}
		}
		
		// add an enemy if there isn't one
		if (enemies.length === 0) {
			switch(Math.round(rand(-0.49, 2.49))) {
				case 0: enemies.push(new Enemy(ENEMY_TYPES.GATOR));
					break;
				case 1: enemies.push(new Enemy(ENEMY_TYPES.RAT));
					break;
				default: enemies.push(new Enemy(ENEMY_TYPES.BAT));
					break;
			}
		}
		
		// update enemies
		for (var i = 0; i < enemies.length; ++i) {
			// only actually update enemies if player is in control
			if (inControl())
				enemies[i].update();
			// otherwise, just do the draw
			else
				enemies[i].draw();
		};
		
		// update projectiles
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].update();
		};
		
		// update particle systems
		for (var i = 0; i < particleSystems.length; ++i) {	
			particleSystems[i].update();
		}
		
		// update all particles
		for (var i = 0; i < particles.length; ++i) {
			particles[i].update();
		}
		
		// update & draw terrain objects
		for (var i = 0; i < terrains.length; ++i) {
			// update it
			terrains[i].update();
			
			// get currently looped terrain object
			var currentTerrain = terrains[i];
			
			// delete the terrain if it has gone off screen a bit
			if (currentTerrain.position.x < -TERRAIN_WIDTH*2) {
				lightSources.safeSplice(lightSources.indexOf(currentTerrain.light), 1);
				terrains.safeSplice(i, 1);
				
				// in/decrement game variables if the game is running
				if (inControl()) {
					++score;
					++experience;
					--currentLevelLength;
				}
			}
		}
		//}
		
		//== SPAWN NEW TERRAINS //{
		// get position of last terrain object's edge
		var lastX = terrains[terrains.length-1].position.x+TERRAIN_WIDTH;
		// if the last 
		if (lastX < canvas.width) {
			terrains[terrains.length] = new Terrain(lastX);	// create a new terrain at the edge of the last one
			--terrainCount;	// subtract from the number of terrains of current type to make
			
			// check if we've reached the end of this terrain type
			if (terrainCount <= 0) {
				// force base ground to generate after each other terrain type or at the end of the level
				if (currentTerrainType != TERRAIN_TYPES.BASE || currentLevelLength <= 0) {
					currentTerrainType = TERRAIN_TYPES.BASE;
					// ground patches get shorter as game speeds up
					terrainCount = Math.max(3, Math.round(15 - globalGameSpeed*.75));
				}
				// otherwise, generate another "danger terrain"
				else {
					// terrain type becomes random danger
					currentTerrainType = TERRAIN_TYPES.randomDangerous();
					
					// danger patches get larger as game speeds up
					terrainCount = Math.min(5, Math.floor(Math.random()*globalGameSpeed/5) + 2);
				}
			}
		};
		//}
		
		//== LIGHTING //{
		// Overlay all in black
		offCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
		offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
		offCtx.globalCompositeOperation = "destination-out";
		
		// Cut out light sources
		offCtx.save();
			for (var i = 0; i < lightSources.length; ++i) {
				// get the current light source
				var l = lightSources[i];
				
				// create a radial gradient
				var radial = offCtx.createRadialGradient(l.position.x, l.position.y, Math.max(l.radius, 0), l.position.x, l.position.y, 0);
				radial.addColorStop(0, "rgba(225, 175, 20, 0)");
				radial.addColorStop(1, "rgba(225, 175, 20, 0.5)");
				offCtx.fillStyle = radial;

				// subtract the light from the main canvas
				offCtx.beginPath();
				offCtx.arc(l.position.x, l.position.y, Math.max(l.radius, 0), 0, Math.PI*2, false);
				offCtx.globalCompositeOperation = "destination-out";
				offCtx.fill();
			}
		offCtx.restore();
		
		for (var i = 0; i < lightSources.length; i++) {
			lightSources[i].update();
		}
		
		// Simulate torches in background
		for (var i = -(time*3 % background.width) - background.width; i < canvas.width; i += background.width) {			
			// create a radial gradient
			var radial = offCtx.createRadialGradient(i + 467, 155, 450, i + 467, 155, 0);
			radial.addColorStop(0, "rgba(255, 255, 255, 0)");
			radial.addColorStop(0.2, "rgba(255, 255, 255, 0.075)");
			radial.addColorStop(1, "rgb(255, 255, 255)");
			offCtx.fillStyle = radial;
        
			// subtract the light from the main canvas
			offCtx.beginPath();
			offCtx.arc(i + 467, 155, 450, 0, Math.PI*2, false);
			offCtx.fill();
		}
		
		// Put offscreen canvas onto main
		ctx.drawImage(offCanvas, 0, 0);
		//}
		
		// Post Processes
		for (var i = 0; i < postProcesses.length; ++i) {
			postProcesses[i]();
		}
		
		/*
		// draw HUDs
		if (currentGameState != GAME_STATE.DEAD) {
			game.windowManager.updateAndDraw([{name:"score", value:[score]}]);
			
			// draw score in upper right
			//var grad = ctx.createLinearGradient(0, 0, 150, 0);
			//grad.addColorStop(0, "rgba(0, 0, 0, 0)");
			//grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
			//ctx.fillStyle = grad;
			//ctx.fillRect(canvas.width-150, 0, 150, 50);
			//fillText(ctx, "Score: " + score, canvas.width - 75, 25, "20pt Calibri", "white");
			//ctx.fill();
		}
		// draw death screen if player has died
		else {
			ctx.save();
			ctx.fillStyle = "black";
			ctx.globalAlpha = 0.7;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "You died.", canvas.width/2, canvas.height/2 - 40, "30pt 'Uncial Antiqua'", "white");
			fillText(ctx, "Score: " + score, canvas.width/2, canvas.height/2, "24pt Calibri", "white");
			fillText(ctx, "Press H to view high scores", canvas.width/2, canvas.height/2 + 40, "24pt Calibri", "white");
			fillText(ctx, "Press space to restart", canvas.width/2, canvas.height/2 + 80, "24pt Calibri", "white");
			ctx.restore();
		};
		*/
	}
	
	// FUNCTION: checks if the object 'o' is on screen
	function onScreen(o) {
		// get world object position in screen coords
		return (o.position.x < canvas.width && o.position.x + o.bounds.x > 0 && o.position.y < canvas.height && o.position.y + o.bounds.y > 0);
	}
	
	// BASE CLASS: game object with physics and bounding box variables
	function GameObject() {
		// starting position of game object
		this.position = new Victor();
		// bounding box width and height for game object
		this.bounds = new Victor();
		// offset to draw the object's image at, changes it's "point of rotation" in a sense
		this.offset = new Victor();
		
		// MUTATOR: force object's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position.x = clamp(x, 0, canvas.width);
			this.position.y = clamp(y, 0, canvas.height);
		};

		// HELPER: returns a vector from the center of this game object
		// to the center of the given game object
		this.vecToOther = function(other) {
			// if either object has no bounds, use 0 size bounding box
			var mBounds = (this.bounds != undefined ? this.bounds : Victor());
			var oBounds = (other.bounds != undefined ? other.bounds : Victor());
			return other.position.clone().add(oBounds.clone().divide(Victor(2, 2))).subtract(this.position.clone().add(mBounds.clone().divide(Victor(2, 2))));
		};
		
		// HELPER: returns whether this object overlaps another
		this.overlaps = function(other) {
			return (other.position.y + other.bounds.y > this.position.y && other.position.y < this.position.y + this.bounds.y
				 && other.position.x + other.bounds.x > this.position.x && other.position.x < this.position.x + this.bounds.x);
		}
	};
	
	// BASE CLASS: game object that can move
	function MobileObject() {
		GameObject.call(this);
	
		// starting velocity of game object
		this.velocity = new Victor();
		this.numJumps = 0;		// number of jumps the object has done in current sequence
		this.maxJumps = 2;		// max number of jumps the object can do in sequence
		this.onGround = true;	// whether the object is currently grounded
		this.maxHealth = 0; 	// this object's max health
		this.health = 0; 		// this object's current health
		this.fireTicks = 0;		// duration of fire, causes damage over time
		this.stunTicks = 0;		// duration of stun, can't attack while stunned
		
		// MUTATOR: force object's velocity
		this.setVelocity = function(x, y) {
			this.velocity = new Victor(x, y);
		};
		
		// HELPER: damage the object
		this.damage = function(strength) {
			this.health -= strength;
		};
		
		// FUNCTION: update mobile object's phsyics
		this.updatePhysics = function() {
			// loop through velocity
			for (var i = 0; i < this.velocity.length(); ++i) {
				// distance we'll move along each axis this loop
				var moveDistX = 0; var moveDistY = 0;
				// move distance is 1, or the decimal remainder of velocity on the last loop
				// only actually update the moveDist if it would be > 0
				if (Math.abs(this.velocity.x) - i > 0)
					moveDistX = (Math.abs(this.velocity.x) - i < 1 ? Math.abs(this.velocity.x) - i : 1) * Math.sign(this.velocity.x);
				// only do vertical target tracking if they're a flying enemy
				if (Math.abs(this.velocity.y) - i > 0)
					moveDistY = (Math.abs(this.velocity.y) - i < 1 ? Math.abs(this.velocity.y) - i : 1) * Math.sign(this.velocity.y);
				
				// variable to store if its safe to move
				var positionSafe = true;
				
				// loop through terrain objects and check if we can move down
				for (var ii = 0; ii < terrains.length; ++ii) {
					// get currently looped terrain object
					var currentTerrain = terrains[ii];
					
					// check is position we'd move to is safe (above terrain)
					// terrain we're checking is below is
					if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.x + moveDistX > currentTerrain.position.x) {
						// terrain below us is solid ground and we'd be inside it if we moved down
						if (this.position.y + this.bounds.y + moveDistY > currentTerrain.position.y && currentTerrain.isSolid()) {
							// it's not safe to move
							positionSafe = false;
							break;
						};
					};
				};
				
				// if we're safe to move, shift down
				if (positionSafe || (this.position.y + this.bounds.y > currentTerrain.position.y)) {
					this.position.x += moveDistX;
					this.position.y += moveDistY;
				}
				else
				// If we're not safe, stick to the ground - particles don't do this
				if (!(this instanceof Particle)) {
					// Projectiles don't disable velocity because they used it in their update
					if (!(this instanceof Projectile)) {
						this.velocity.y = 0;
					}
					
					this.position.y = canvas.height - TERRAIN_HEIGHT - this.bounds.y;
					this.numJumps = 0;
					this.onGround = true;
					break;
				};
			}
		}
		
		// FUNCTION: force a jump
		this.jump = function(speed, startingPush, force) {
			// first check if they're on the ground
			if (this.numJumps < this.maxJumps || force) {
				// don't increment number of jumps if it's a forced jump
				if (!force)
					++this.numJumps;
				
				// give the initial thrust
				this.velocity.y = -speed;
				this.position.y -= startingPush;
				this.onGround = false;
				// force animation to run a bit
				++this.time;
			};}.bind(this);
	};
	
	// CLASS: terrain object
	function Terrain(startX) {
		GameObject.call(this);
		
		/* VARIABLES */
		// terrain bounds
		this.bounds = new Victor(TERRAIN_WIDTH,	TERRAIN_HEIGHT);
		// starting terrain position
		this.position = new Victor(startX, canvas.height-this.bounds.y);
		// terrain's type is global type at time of its spawn 
		this.terrainType = currentTerrainType;
		// if the terrain has been iced by the wizard's spell - acts as solid
		this.iced = false;
		// attach a light source if this is lava
		this.light = {};
		if (this.terrainType === TERRAIN_TYPES.LAVA) {
			this.light = new LightSource(this, 150, -1, true, 1);
			lightSources.push(this.light);
		}
		
		// check if the magi ice bridge is active, and if so, freeze this terrain
		if (magi != {}) {
			if (magi.abilities.W.duration > 0 && magi.deathTime === 0) {
				this.iced = true;
				particleSystems.push(new ParticleSystem(this, PARTICLE_TYPES.FROST, -1, 120, 0.15));
			}
		}
		
		// FUNCTION: returns if the terrain is solid
		this.isSolid = function() {
			return this.terrainType.isSolid || this.iced;
		}
		
		// FUNCTION: update terrain position, draw it
		this.update = function() {
			// slide terrain object left quicker if
			for (var i = 0; i < 1 + paladin.abilities.W.duration/6; ++i)
				this.position.x -= globalGameSpeed;
			
			// try to push players
			for (var i = 0; i < players.length; ++i) {
				// first, check player is alive
				if (players[i].deathTime === 0)
					// if the player overlaps the terrain
					if (players[i].overlaps(this)) {
						// if this terrain is solid...
						if (this.isSolid()) {
							// ...push the player against the terrain
							players[i].position.x = this.position.x - players[i].bounds.x;
						}
						
						// if it's lava, bounce the player and damage them
						if (this.terrainType === TERRAIN_TYPES.LAVA && players[i].position.y + players[i].bounds.y > this.position.y + this.bounds.y/10) {
							players[i].jump(15, 1, true); // forced jump
							players[i].numJumps = 0; // reset jumps so the forced jump doesn't kill them
							players[i].damage(10); // do some damage
						}
					};
			};
			
			// Draw the terrain - lava draws as a post-process
			if (this.terrainType === TERRAIN_TYPES.LAVA) {
				postProcesses.push(this.draw.bind(this));
			}
			else {
				this.draw();
			}
		};
		
		// FUNCTION: draw the terrain object
		this.draw = function() {
			// draw the terrain object
			ctx.save();
				// draw the terrain image
				if (this.terrainType != TERRAIN_TYPES.VOID) {
					ctx.drawImage(this.terrainType.img, this.position.x, this.position.y);
				}
				
				// draw an icy overlay if it's been frozen by the magi
				if (this.iced) {
					ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
					ctx.fillRect(this.position.x, this.position.y, this.bounds.x, this.bounds.y);
				}
			ctx.restore();
		}
	};
	
	// CLASS: player object
	function Player(classType) {
		MobileObject.call(this);
	
		/* VARIABLES */
		this.classType = classType;		// player's class - Paladin, Ranger, or Magi
		this.maxJumps = 2;				// max number of jumps they can do in sequence
		this.order = players.length; 	// order in the party - defaults to last
		this.maxHealth = this.health = classType.health; // this player's health and max health
		this.deathTime = 0;
		this.bounds = new Victor(		// the player's bounding width and height
			this.classType.width,
			this.classType.height
		);
		this.position = new Victor(		// starting player position
			275 - players.length*100,
			canvas.height-TERRAIN_HEIGHT-this.bounds.y-250
		);
		this.abilities = {				// stores info about each skill
			Q: {
				strength: function() {},
				duration: 0,
				cooldown: 0,
				level: 0,
				maxDur: this.classType.qDur,
				maxCool: this.classType.qCool,
				levelUp: function() {}
			},
			W: {
				strength: function() {},
				duration: 0,
				cooldown: 0,
				level: 0,
				maxDur: this.classType.wDur,
				maxCool: this.classType.wCool,
				levelUp: function() {}
			},
			E: {
				strength: function() {},
				duration: 0,
				cooldown: 0,
				level: 0,
				maxDur: this.classType.eDur,
				maxCool: this.classType.eCool,
				levelUp: function() {}
			},
			decrement: function() {
				this.Q.duration = Math.max(0, this.Q.duration-1);
				this.W.duration = Math.max(0, this.W.duration-1);
				this.E.duration = Math.max(0, this.E.duration-1);
				this.Q.cooldown = Math.max(0, this.Q.cooldown-1);
				this.W.cooldown = Math.max(0, this.W.cooldown-1);
				this.E.cooldown = Math.max(0, this.E.cooldown-1);
			},
			reset: function() {
				this.Q.duration = this.W.duration = this.E.duration =
				this.Q.cooldown = this.W.cooldown = this.E.cooldown = 0;
			}
		};
		
		this.time = this.order*20;		// used to control animation timing
		this.frameWidth = this.classType.img.width/28; // width of 1 frame from the spritesheet
		this.frameHeight = this.classType.img.height;  // height of 1 frame from the spritesheet
		this.offset = new Victor(this.frameWidth/-3, this.frameHeight/-8); // player's image offset
					
		// Update ability information based on class type
		switch (this.classType) {
			// Paladin!
			case PLAYER_CLASSES.PALADIN:
				// Paladin-specific level up functions
				this.abilities.Q.levelUp = function() {
					if (experience >= 30 + this.level*20 && this.level < 10) {
						this.maxDur += 45;
						this.maxCool -= 20;
						++this.level;
					}
				}
				this.abilities.W.levelUp = function() {
					if (experience >= 30 + this.level*15 && this.level < 10) {
						this.maxDur += 3;
						this.maxCool -= 20;
						++this.level;
					}
				}
				this.abilities.E.levelUp = function() {
					if (experience >= 50 + this.level*75 && this.level < 10) {
						this.maxCool -= 60;
						++this.level;
					}
				}
				break;
			case PLAYER_CLASSES.RANGER:
				// Ranger-specific level up functions
				this.abilities.Q.levelUp = function() {
					if (experience >= 30 + this.level*15 && this.level < 10) {
						this.maxCool -= 1.4;
						++this.level;
					}
				}
				this.abilities.W.levelUp = function() {
					if (experience >= 20 + this.level*20 && this.level < 10) {
						this.maxCool -= 24;
						++this.level;
					}
				}
				this.abilities.E.levelUp = function() {
					if (experience >= 50 + this.level*30 && this.level < 10) {
						this.maxCool -= 30;
						++this.level;
					}
				}
				// Ranger-specific strength functions
				this.abilities.Q.strength = function() { return 3 + ranger.abilities.Q.level; };
				this.abilities.E.strength = function() { return 30 + ranger.abilities.E.level*5; };
				break;
			case PLAYER_CLASSES.MAGI:
				// Magi-specific level up functions
				this.abilities.Q.levelUp = function() {
					if (experience >= 25 + this.level*25 && this.level < 10) {
						this.maxCool -= 4;
						++this.level;
					}
				}
				this.abilities.W.levelUp = function() {
					if (experience >= 50 + this.level*50 && this.level < 10) {
						this.maxDur += 15;
						this.maxCool -= 30;
						++this.level;
					}
				}
				this.abilities.E.levelUp = function() {
					if (experience >= 50 + this.level*35 && this.level < 10) {
						this.maxDur += 15;
						this.maxCool -= 30;
						++this.level;
					}
				}
				// Magi-specific strength functions
				this.abilities.Q.strength = function() { return 5 + magi.abilities.Q.level*2; };
				break;
		}
		
		// FUNCTION: cycle order by a number
		// can be negative to cycle right
		this.cycleOrder = function(num) {
			// get number of living players
			var numAlive = 0;
			for (var i = 0; i < players.length; ++i) {
				if (players[i].deathTime === 0) {
					++numAlive;
				}
			}
		
			this.order = (this.order + num < 0 ? numAlive + (this.order + num) : this.order + num) % numAlive;
		};
		
		// FUNCTION: prints player information to console
		this.toString = function() {
			console.log("Player in position " + this.order + " is at " + this.position.toString());
		};
		
		// FUNCTION: damage the player, does appropriate armor checks, etc
		this.damage = function(power) {
			if (this.deathTime >= 0)
				this.health -= power;
		};
		
		// FUNCTION: main player object tick
		this.update = function() {					
			// occasionally play running sfx
			if (this.onGround && time % 15 + this.order === 0) {
				playStream("run.wav", 0.175);
			}
			
			// kill player if they've fallen far enough screen or at 0 health
			if (this.position.y > canvas.height*2 || this.health <= 0) {
				// force health to 0 in case we died from a fall
				this.health = 0;
				
				// slide ones behind this one forward
				for (var i = 0; i < players.length; ++i) {
					if (players[i].order > this.order && players[i].deathTime === 0) {
						--players[i].order;
					}
				};
				
				// reset ability runtimes and cooldowns
				this.abilities.reset();
				
				// start this one's death counter
				++this.deathTime;
			};
			
			// regen some health and clamp health within 0 and max
			this.health = clamp(this.health + 0.02, 0, this.maxHealth);
			
			// decrement timing and ability variables
			this.abilities.decrement();
			
			// clamp order within player list
			this.order = clamp(this.order, 0, players.length-1);
			
			// try to move towards where it should be in the running order
			if (this.position.x != 275 - this.order*100) {
				// only try to move if its above the terrain level
				if (this.position.y + this.bounds.y <= canvas.height - TERRAIN_HEIGHT) {
					// if it's close, round off
					if (Math.abs(this.position.x - (275 - this.order*100)) <= 3) {
						this.position.x = 275 - this.order*100;
					}
					// otherwise, move towards where it should be
					else {
						this.position.x -= Math.sign(this.position.x - (275 - this.order*100))*5;
					};
				};
			};
			
			// Update phsyics
			// only apply physics to fully alive players
			if (this.deathTime === 0) {
				this.velocity.y += GRAVITY*dt
				this.updatePhysics();
			}
			// For respawning players, they slowly descend to ground height
			else if (this.deathTime < 0) {
				this.position.y = clamp(this.position.y + 6, -this.bounds.y, canvas.height - TERRAIN_HEIGHT - this.bounds.y);
				
				// If we've reached ground height, transition back to normal state
				if (this.position.y === canvas.height - TERRAIN_HEIGHT - this.bounds.y) {
					this.velocity.y = 0;
					this.numJumps = 0;
					this.onGround = true;
					this.deathTime = 0;
				}
			}
				
			// DRAW: draw the player
			this.draw();
		};
		
		// FUNCTION: main player draw call
		this.draw = function() {
			// increment timing for animation
			if (this.onGround)
				this.time = (this.time+0.75) % 28;
			else
				if (this.time != 0 && this.time != 13)
					this.time = Math.round(this.time+1) % 28;
					
			ctx.save();
				// draw the player's actual image from its spritesheet
				ctx.drawImage(this.classType.img, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, this.position.x + this.offset.x, this.position.y + this.offset.y, this.frameWidth, this.frameHeight);
					
				// if the one drawing is the paladin, draw the shield if it's up
				if (this.classType === PLAYER_CLASSES.PALADIN && this.abilities.Q.duration > 0) {
					// loop players
					for (var i = 0; i < players.length; ++i) {
						// draw shield in front of first player
						var p = players[i];
						if (p.order === 0 && players[i].deathTime === 0) {
							ctx.drawImage(this.classType.shield, p.position.x + p.bounds.x, p.position.y + p.bounds.y - this.classType.shield.height);
						}
					}
				}
				
				// draw health above head
				ctx.fillStyle = "red";
				ctx.fillRect(this.position.x+10, this.position.y - 14, this.bounds.x-20, 5);
				ctx.fillStyle = "green";
				ctx.fillRect(this.position.x+10, this.position.y - 14, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
			ctx.restore();
		}
			
		/* ATTACKING */
		// FUNCTION: 1st attack ('Q')
		this.qAttack = function() {
			// if the player is in control and the ability is off cooldown, activate it
			if (this.abilities.Q.cooldown === 0 && inControl()) {
				// play the ability's sound effect
				playStream(this.classType.qSnd, 0.2);
				
				switch(this.classType) {
					case PLAYER_CLASSES.PALADIN:
						// activate the shield
						this.abilities.Q.duration = this.abilities.Q.maxDur;
						this.abilities.Q.cooldown = this.abilities.Q.maxCool;
						break;
					case PLAYER_CLASSES.RANGER:
						// shoot an arrow towards the first enemy
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2, this.position.y+this.bounds.y/4, enemies[0], PROJECTILE_TYPES.ARROW, false));
						this.abilities.Q.duration = this.abilities.Q.maxDur;
						this.abilities.Q.cooldown = this.abilities.Q.maxCool;
						break;
					case PLAYER_CLASSES.MAGI:
						// shoot a fireball
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2, this.position.y+this.bounds.y/4, enemies[0], PROJECTILE_TYPES.MAGIFIREBALL, false));
						this.abilities.Q.duration = this.abilities.Q.maxDur;
						this.abilities.Q.cooldown = this.abilities.Q.maxCool;
						break;
				};
			};
		};
		
		// FUNCTION: 2nd attack ('W')
		this.wAttack = function() {
			// if player is in control and the ability is off cooldown, activate it
			if (this.abilities.W.cooldown === 0 && inControl()) {
				// play the ability's sound effect
				playStream(this.classType.wSnd, 0.2);
				
				switch(this.classType) {
					case PLAYER_CLASSES.PALADIN:
						// dash forward
						this.abilities.W.duration = this.abilities.W.maxDur;
						this.abilities.W.cooldown = this.abilities.W.maxCool;
						break;
					case PLAYER_CLASSES.RANGER:
						// loop players and force a jump after a delay based on party order
						for (var i = 0; i < players.length; ++i) {
							// only schedule jumps for living players
							if (players[i].deathTime === 0) {
								setTimeout(players[i].jump, players[i].order*jumpFunction(), 15, 1, true);
							}
						};
						this.abilities.W.duration = this.abilities.W.maxDur;
						this.abilities.W.cooldown = this.abilities.W.maxCool;
						break;
					case PLAYER_CLASSES.MAGI:
						// ice over terrains
						if (this.position.y + this.bounds.y <= canvas.height - TERRAIN_HEIGHT) {
							for (var i = 0; i < terrains.length; ++i) {
								terrains[i].iced = true;
								particleSystems.push(new ParticleSystem(terrains[i], PARTICLE_TYPES.FROST, -1, 120, 0.15));
							}
							
							particleSystems.push(new ParticleSystem(this, PARTICLE_TYPES.ICE, 30, -1, 1));
							this.abilities.W.duration = this.abilities.W.maxDur;
							this.abilities.W.cooldown = this.abilities.W.maxCool;
						}
						break;
				}
			}
		}
		
		// FUNCTION: 3rd attack ('E')
		this.eAttack = function() {
			// if player is in control and the ability is off cooldown, activate it
			if (this.abilities.E.cooldown === 0 && inControl()) {
				// play the ability's sound effect
				playStream(this.classType.eSnd, 0.2);
				
				switch(this.classType) {
					case PLAYER_CLASSES.PALADIN:
						// put on cooldown
						this.abilities.E.duration = this.abilities.E.maxDur;
						this.abilities.E.cooldown = this.abilities.E.maxCool;
						
						// loop players and heal them
						for (var i = 0; i < players.length; ++i) {
							// for living players, just heal their health
							if (players[i].deathTime === 0) {
								players[i].health = clamp(players[i].health+25, 0, players[i].maxHealth);
								
								// Attach a heal particle system to the player
								particleSystems.push(new ParticleSystem(players[i], PARTICLE_TYPES.HEAL, 20, 30, 1));
									
								var light = new LightSource(players[i], 150, -1, false, 1);
								light.root = "dying";
								lightSources.push(light);
							}
							// for dead players, speed up their respawn
							else if (players[i].deathTime > 0) {
								players[i].deathTime += 120;
							}
						}
						break;
					case PLAYER_CLASSES.RANGER:
						// throw a grenade
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2, this.position.y+this.bounds.y/4, enemies[0], PROJECTILE_TYPES.GRENADE, false));
						this.abilities.E.duration = this.abilities.E.maxDur;
						this.abilities.E.cooldown = this.abilities.E.maxCool;
						break;
					case PLAYER_CLASSES.MAGI:
						// stun the enemy
						enemies[0].stunTicks = this.abilities.E.maxDur;
						particleSystems.push(new ParticleSystem(enemies[0], PARTICLE_TYPES.STUN, this.abilities.E.maxDur, 30, 0.2));
						this.abilities.E.duration = this.abilities.E.maxDur;
						this.abilities.E.cooldown = this.abilities.E.maxCool;
						break;
				};
			};
		};
	};
 
	// CLASS: projectile
	function Projectile(x, y, towards, projType, enemy) {
		MobileObject.call(this);
		
		// type of projectile
		this.projType = projType;
		this.enemyProj = enemy; // whether an enemy fired it (only hits players)
		this.speed = this.projType.velocity;
		this.gravity = this.projType.gravity;
		this.onGround = false;
		// the projectile's bounding box
		this.bounds = new Victor(this.projType.width, this.projType.height);
		// starting projectile position
		this.position = new Victor(x, y);
		
		// starting projectile velocity
		// directs itself towards the "towards" object passed in
		if (towards != undefined) {
			if (towards.position != undefined) {
				this.velocity = this.vecToOther(towards).clone().norm().multiply(Victor(this.speed, this.speed));
			}
			else {
				this.velocity = Victor().subtract(this.position);
			}
		}
		else {
			this.velocity = Victor().subtract(this.position);
		}
			
		// attach a particle system based on its projectile type
		if (this.projType === PROJECTILE_TYPES.MAGIFIREBALL) {
			this.system = new ParticleSystem(this, PARTICLE_TYPES.FLAME, -1, 10, 5);
			particleSystems.push(this.system);
			this.light = new LightSource(this, this.projType.width*2, -1, true, 1);
			lightSources.push(this.light);
		}
		
		// give an upwards thrust if it's affected by gravity
		if (this.gravity) {
			this.velocity.y -= 15;
		}
		
		// FUNCTION: main projectile object tick
		this.update = function() {		
			// kill projectile if off screen
			if (!onScreen(this)) {
				// delete this one
				projectiles.safeSplice(projectiles.indexOf(this), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				return;
			};
			
			// whether the projectile has collided with something
			var collided = false;
			var victim = {}; // stores who/what the projectile hit
			
			// find the first player
			var firstPlayer;
			if (players.length > 0) {
				firstPlayer = players[0]; // variable where we will store front player
			}
			else {
				firstPlayer = {};
			}
				
			// loop through players for collisions if it's an enemy projectile
			for (var i = 0; i < players.length; ++i) {
				// only check living players
				if (players[i].deathTime === 0) {
					// get currently looped terrain object
					var p = players[i];
					
					// store first player in running order
					if (p.order < firstPlayer.order && players[i].deathTime === 0)
						firstPlayer = p;
					
					// only check player collisions if it's an enemy projectile
					if (this.enemyProj)
						// update collided variable by comparing pos to each terrain object
						if (this.position.x < p.position.x + p.bounds.x && this.position.x + this.bounds.x > p.position.x) {
							if (this.position.y + this.bounds.y > p.position.y && this.position.y < p.position.y + p.bounds.y) {
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
				if (this.position.x < e.position.x + e.bounds.x && this.position.x + this.bounds.x > e.position.x) {
					if (this.position.y + this.bounds.y > e.position.y && this.position.y < e.position.y + e.bounds.y) {
						collided = true;
						victim = e;
						break;
					}
				}
			};
			
			// check if it has hit the player's shield, and bounce if so
			if (this.enemyProj && firstPlayer != {}) {
				// thier shield is up
				if (paladin.abilities.Q.duration > 0 && paladin.deathTime === 0) {
					// check for collisions with the shield box
					if (this.position.x < firstPlayer.position.x + firstPlayer.bounds.x + 25 && this.position.x + this.bounds.x > firstPlayer.position.x) {
						// overlap detected
						if (this.position.y + this.bounds.y > paladin.position.y-paladin.bounds.y*.25 && this.position.y < paladin.position.y + paladin.bounds.y) {
							// bounce
							this.velocity.x *= -0.5;
							// now is a player projectile
							this.enemyProj = false;
						}
					}
				}
			}
			
			// Apply gravity and update physics
			if (this.gravity) {
				this.velocity.y += GRAVITY*dt
			}
			
			this.updatePhysics();
			
			// If on the ground, bounce or kill projectile depending on y velocity
			if (this.onGround) {
				if (Math.abs(this.velocity.y) > 1) {
					this.jump(this.velocity.y*0.75, 10, true);
				}
				else {
					collided = true;
					victim = new Terrain(0);
				}
			}
			
			// We hit something!
			if (collided) {
				// only attempt to damage living objects
				if (!(victim instanceof Terrain)) {
					victim.damage(this.projType.strength());
				
					// if this is a magi fireball, ignite the enemy
					if (this.projType === PROJECTILE_TYPES.MAGIFIREBALL || this.projType === PROJECTILE_TYPES.GRENADE) {
						particleSystems.push(new ParticleSystem(victim, PARTICLE_TYPES.FLAME, 60, 30, 5));
						victim.fireTicks = 60;
					}
				}
				
				// the grenade gets a particle burst on hit
				if (this.projType === PROJECTILE_TYPES.GRENADE) {
					particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: this.bounds.clone()}, PARTICLE_TYPES.FLAME, 1, 30, 60));
				}
			
				// delete this one
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				projectiles.safeSplice(projectiles.indexOf(this), 1);
			};
				
			// DRAW: draw the projectile
			if (this.projType.postProcess) {
				postProcesses.push(this.draw.bind(this));
			}
			else {
				this.draw();
			}
		};
	
		// FUCNTION: main projectile draw call
		this.draw = function() {
			ctx.save();
				// We move/rotate the canvas to draw the projectile at its correct rotation
				ctx.translate(this.position.x + this.bounds.x/2, this.position.y + this.bounds.y/2);
				ctx.rotate(this.velocity.angle());
				ctx.drawImage(this.projType.img, -this.bounds.x/2, -this.bounds.y/2);
			ctx.restore();
		};
	};
	
	// CLASS: enemy object
	function Enemy(enemyType) {
		MobileObject.call(this);
		
		/* VARIABLES */
		this.enemyType = enemyType;		// what type of enemy this is
		this.maxJumps = 3;				// max number of jumps they can do in sequence
		this.time = 0; 					// controls sprite animation timing
		this.health = this.maxHealth = this.enemyType.health; // get health and max health of this enemy type
		this.bounds = new Victor(
			this.enemyType.width,
			this.enemyType.height
		);
		this.position = new Victor(		// starting enemy position
			canvas.width + this.bounds.x*1.5,
			canvas.height-TERRAIN_HEIGHT-this.bounds.y*2
		);
		this.frameWidth = this.enemyType.img.width/28; // width of 1 frame from the spritesheet
		this.frameHeight = this.enemyType.img.height;  // height of 1 frame from the spritesheet
		this.offset = new Victor(this.frameWidth/-4, this.frameHeight/-4); // enemys's image offset
		
		// set target differently depending on AI
		switch (this.enemyType.AI) {
			// if they're flying, they home to the top right
			case "flying":
				this.targetPos = new Victor(	// the location the enemy is homing towards
					canvas.width - this.bounds.x*1.5,
					this.bounds.y*1.5
				);
				break;
			// if it's a running enemy, they home to the right side
			default:
				this.targetPos = new Victor(	// the location the enemy is homing towards
					canvas.width - this.bounds.x*1.5,
					canvas.height-TERRAIN_HEIGHT-this.bounds.y
				);
				break;
		};
		
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
				experience += this.enemyType.health;
				
				// delete this one
				enemies.safeSplice(enemies.indexOf(this), 1);
			};
			
			// bobbing for flying enemies
			if (this.enemyType.AI === "flying") {
				this.position.y += Math.sin(time/10);
			}
				
			// lose health from active DOTs
			if (this.fireTicks > 0) {
				--this.fireTicks;
				this.health -= 0.05;
			};
			
			// home towards target position
			if (this.targetPos != undefined) {
				// if it's close, snap to its homing position
				if (this.position.distanceSq(this.targetPos) <= 9) {
					this.position = this.targetPos;
					this.targetPos = undefined;
					this.velocity = new Victor();
				}
				// otherwise, velocity homes towards its target
				else {
					// if it's a flying enemy, it uses true homing
					if (this.enemyType.AI === "flying")
						this.velocity = this.targetPos.clone().subtract(this.position).divide(new Victor(20, 20));
					// otherwise, only set x velocity
					else
						this.velocity.x = this.targetPos.clone().subtract(this.position).divide(new Victor(20, 20)).x;
				};
			};
				
			// update phsyics
			this.velocity.y += GRAVITY*dt
			this.updatePhysics();
			
			// only jump or apply gravity on non-flying enemies
			if (this.enemyType.AI != "flying") {
				// attempt to jump if it falls below the terrain line
				if (this.position.y + this.bounds.y > canvas.height - TERRAIN_HEIGHT) {
					this.jump(15, 1);
				}
			}
			
			// Decrement stun timer if it's up
			if (this.stunTicks > 0) {
				--this.stunTicks;
			}
			// If we're not stunned, attempt to shoot a projectile
			else {
				if (rand(0, Math.max(70, 125 - currentLevel*2)) < 1) {
					for (var i = 0; i < players.length; ++i) {
						if (players[i].order === 0 && players[i].deathTime <= 0) {
							projectiles.push(new Projectile(this.position.x, this.position.y, players[i], PROJECTILE_TYPES.POISONBOLT, true));
							break;
						}
					}
				}
			}
				
			// DRAW: draw the enemy
			this.draw();
		};
	
		// FUCNTION: main enemy draw call
		this.draw = function() {
			// Increment timing for animation
			// When on ground, timing increases normally
			if (this.onGround || this.enemyType.AI === "flying") {
				this.time = (this.time + 0.75 - (this.stunTicks/400)) % 28;
			}
			// When off ground, animate differently
			else {
				// Only animate until we reach a "leap" pose
				if (this.time != 0 && this.time != 13) {
					// Calculation is slightly different, animate quicker when in the air
					this.time = Math.round(this.time+1 - (this.stunTicks/400)) % 28;
				}
			}
					
			ctx.save();
				// Draw sprite
				ctx.drawImage(this.enemyType.img, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, this.position.x + this.offset.x, this.position.y + this.offset.y, this.frameWidth, this.frameHeight);
				
				// Draw health above head
				ctx.fillStyle = "red";
				ctx.fillRect(this.position.x+10, this.position.y - 10, this.bounds.x-20, 5);
				ctx.fillStyle = "green";
				ctx.fillRect(this.position.x+10, this.position.y - 10, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
				ctx.fill();
			ctx.restore();
		};
	};
 
	// CLASS: particle system
	function ParticleSystem(root, particleType, lifetime, particleLifetime, particlesPerFrame) {
		// assign starting variables
		this.root = root;						// the object this is linked to
		this.time = 0;							// system's time lived
		this.position = root.position.clone().add(root.bounds.clone().divide(Victor(2, 2)));
		
		// update particle system
		this.update = function() {
			// delete this if its root is gone
			if (this.root == undefined) {
				particleSystems.safeSplice(particleSystems.indexOf(this), 1);
				return;
			}
		
			// stick to the root object
			this.position = root.position.clone().add(root.bounds.clone().divide(Victor(2, 2)));
		
			// attempt to create new particles
			if (particlesPerFrame >= 1) {
				for (var i = 0; i < particlesPerFrame; ++i)
					particles.push(new Particle(this, particleType, particleLifetime));
			}
			// only a chance to create one if <1 per frame
			else if (Math.random() < particlesPerFrame)
				particles.push(new Particle(this, particleType, particleLifetime));
			
			// increment time lived
			++this.time;
			// delete this system if its time lived has surpassed its lifetime
			if (this.time > lifetime && lifetime > 0) {
				particleSystems.safeSplice(particleSystems.indexOf(this), 1);
			}
		}
	}
	
	// CLASS: particle
	function Particle(parent, particleType, lifetime) {
		// inherits from MobileGameObject
		MobileObject.call(this);
	
		// assign starting variables
		this.parent = parent;
		this.particleType = particleType;	// what type of particle this is
		this.deathtime = 0; 				// used to kill particles if they don't die naturally
		this.lifetime = lifetime;
		this.position = new Victor(parent.root.position.x + parent.root.bounds.x/10 + Math.random()*parent.root.bounds.x*0.8, parent.root.position.y + parent.root.bounds.y/10 + Math.random()*parent.root.bounds.y*0.8);
		this.velocity = this.particleType.vel.call(this);
		this.bounds = new Victor(3, 3);
		this.time = 0;
		
		// update particle
		this.update = function() {
			// affected by gravity based on particle type
			if (this.particleType.gravity)
				this.velocity.y += GRAVITY*dt;
		
			// if particle type collides with terrain, do pixel collisions
			if (this.particleType.collidesTerrain) {
				this.updatePhysics();
				
				if (this.onGround)
					this.velocity.y *= -0.8;
			}
			// otherwise, just move
			else {
				this.position.add(this.velocity);
			}
			
			// increment death timer if the particle is barely moving
			if (this.velocity.length() < 0.1) {
				++this.deathTime;
			}
			
			// increment time lived
			++this.time;
			
			// delete this particle if its time lived has surpassed its lifetime, if it has been still for 100 ticks,
			// or if it has moved offscreen
			if ((this.time > this.lifetime && this.lifetime > 0) || this.deathTime > 100 || !onScreen(this)) {
				particles.safeSplice(particles.indexOf(this), 1);
				return;
			}
				
			// Draw particle
			postProcesses.push(this.draw.bind(this));
		};
		
		// Draw particle
		this.draw = function() {
			// draw based on particle type
			if (this.deathTime > 0) {
				ctx.save();
				ctx.globalAlpha = (50 - this.deathTime)/50;
				ctx.drawImage(this.particleType.img, this.position.x, this.position.y);
				ctx.restore();
			}
			else {
				ctx.drawImage(this.particleType.img, -screenX + this.position.x, this.position.y);
			}
		}
	}
 
	// CLASS: particle system
	function LightSource(root, radius, lifetime, flicker, alpha) {
		// assign starting variables
		this.root = root;								// the object this is linked to
		this.bounds = new Victor(radius*2, radius*2); 	// basic bounds
		this.radius = radius;							// outer radius of the light
		this.alpha = alpha;								// light's alpha (transparency)
		this.position = this.root.position.clone().add(this.root.bounds.clone().divide(Victor(2, 2))).add(this.root.offset.clone());
		
		// Update light source system
		this.update = function() {
			// delete this if its root is gone or it's too small to draw
			if (this.root == undefined || this.radius < 1) {
				lightSources.safeSplice(lightSources.indexOf(this), 1);
				return;
			}
			
			// if the root is instead set to "dying", shrink the light
			if (this.root === "dying") {
				this.radius *= 0.98;
				--this.radius;
			}
			else {
				// stick to root object
				this.position = this.root.position.clone().add(this.root.bounds.clone().divide(Victor(2, 2))).add(this.root.offset.clone());
				
				// flicker radius if flicker is enabled
				if (flicker)
					this.radius = clamp(this.radius * rand(0.99, 1.01), radius*0.9, radius*1.1);
				
				// increment time lived
				++this.time;
				// delete this system if its time lived has surpassed its lifetime
				if (this.time > lifetime && lifetime > 0) {
					lightSources.safeSplice(lightSources.indexOf(this), 1);
				}
			}
		}
	}
	
	// PAUSE FUNCTION: pauses the game
	function pauseGame() {
		// Don't let them pause the title screen
		if (currentGameState === GAME_STATE.RUNNING) {
			previousGameState = currentGameState;
			currentGameState = GAME_STATE.PAUSED;
			bgAudio.pause();
			
			// draw the pause screen
			windowManager.activateUI("pauseScreen");
			deactivateHUD();
		};
	};
	
	// RESUME FUNCTION: resumes the game
	function resumeGame() {
		if (currentGameState === GAME_STATE.PAUSED) {
			currentGameState = previousGameState;
			bgAudio.play();
			
			// deactivate pause screen
			windowManager.deactivateUI("pauseScreen");
			if (currentGameState === GAME_STATE.RUNNING) {
				activateHUD();
			}
		}
	};
	
	// FUNCTION: returns reference to party leader
	function firstPlayer() {
		for (var i = 0; i < players.length; ++i)
			if (players[i].order === 0)
				return players[i];
	}
	
	// FUNCTION: cycles party order
	function cycleParty(direction) {
		for (var i = 0; i < players.length; ++i) {
			// only cycle living players
			if (players[i].deathTime === 0) {
				players[i].cycleOrder(direction);
			}
		}
		// update leader
		leader = firstPlayer();
		
		// update ability HUD
		windowManager.modifyBar("abilityHUD", "qBar", "target", {tgtVar: leader.abilities.Q.cooldown, tgtMax: leader.abilities.Q.maxCool, tgtMin: 0});
		windowManager.modifyBar("abilityHUD", "wBar", "target", {tgtVar: leader.abilities.W.cooldown, tgtMax: leader.abilities.W.maxCool, tgtMin: 0});
		windowManager.modifyBar("abilityHUD", "eBar", "target", {tgtVar: leader.abilities.E.cooldown, tgtMax: leader.abilities.E.maxCool, tgtMin: 0});
	}
	
	// FUCNTION: activate all HUD UI
	function activateHUD() {
		windowManager.activateUI("expHUD");
		windowManager.activateUI("abilityHUD");
		windowManager.activateUI("playerHUD");
	}
	
	// FUNCTION: set up upgrade screen
	function upgrade() {
		// update level complete text
		windowManager.modifyText("shopScreen", "levelComplete", "text", {string: "Level " + currentLevel + " complete!", css: "18pt 'Uncial Antiqua'", color: "#666044"});
		
		// activate upgrade screen
		windowManager.activateUI("shopScreen");
	}
	
	// FUNCTION: deactivate all HUD UI
	function deactivateHUD() {
		windowManager.deactivateUI("expHUD");
		windowManager.deactivateUI("abilityHUD");
		windowManager.deactivateUI("playerHUD");
	}
	
	// FUNCTION: do things based on key presses
	function keyPress(e) {
		// initialize value at keycode to false on first press
		if (keys[e.keyCode] === undefined) {
			keys[e.keyCode] = false;
		}
		
		// spacebar - jump!
		if (e.keyCode === KEY.SPACE) {
			// loop players and jump after a delay based on party order
			for (var i = 0; i < players.length; ++i) {
				// only schedule jumps for living players
				if (players[i].deathTime === 0) {
					setTimeout(players[i].jump, players[i].order*jumpFunction(), 15, 1, false);
					globalLastTerrain = terrains[terrains.length-1];
				}
			};
			
			// if the player has died, restart the game
			if (currentGameState === GAME_STATE.DEAD) {
				currentGameState = GAME_STATE.START;
			};
			
			// if we're in between levels, move on to the next one
			if (currentGameState === GAME_STATE.BETWEEN) {
				// disable upgrade shop UI
				windowManager.toggleUI("shopScreen");
				setupLevel();
			};
			
			// prevent spacebar page scrolling
			e.preventDefault();
		};
		
		if (e.keyCode === KEY.L) {
			console.log(lightSources);
		}
		
		// q - make first player trigger Q ability
		if (e.keyCode === KEY.Q && keys[e.keyCode] === false) {
			// loop players and only initiate ability on one at order 0
			for (var i = 0; i < players.length; ++i) {
				if (players[i].order === 0  && players[i].deathTime === 0)
					players[i].qAttack();
			};
		};
		
		// w - make first player trigger W ability
		if (e.keyCode === KEY.W && keys[e.keyCode] === false) {
			// loop players and only initiate ability on one at order 0
			for (var i = 0; i < players.length; ++i) {
				if (players[i].order === 0  && players[i].deathTime === 0)
					players[i].wAttack();
			};
		};
		
		// e - make first player trigger E ability
		if (e.keyCode === KEY.E && keys[e.keyCode] === false) {
			// loop players and only initiate ability on one at order 0
			for (var i = 0; i < players.length; ++i) {
				if (players[i].order === 0  && players[i].deathTime === 0)
					players[i].eAttack();
			};
		};
		
		// p - toggle game paused
		if (e.keyCode === KEY.P) {
			// check if paused, and toggle it
			if (currentGameState === GAME_STATE.PAUSED) {
				resumeGame();
			}
			else  {
				pauseGame();
			}
		};
		
		// h - view high scores if on main or death screen
		if (e.keyCode === KEY.H) {
			// return to home screen after viewing high scores
			if (currentGameState === GAME_STATE.HIGHSCORE) {
				currentGameState = GAME_STATE.START;
			}
			else
			if (currentGameState === GAME_STATE.DEAD || currentGameState === GAME_STATE.START) {
				currentGameState = GAME_STATE.HIGHSCORE;
				
				// load in the scores from local storage
				highScores = [];
				for (var i = 0; i < 10; ++i) {
					if (typeof(window.localStorage) != undefined) {
						highScores[i] = window.localStorage.getItem("score"+i);
					}
				}
			}
		}
		
		// set the keycode to true
		// we do this last so we can check if this is the first tick it's pressed
		if (!e.simulated)
			keys[e.keyCode] = true;
	};
	
	// FUNCTION: do things based on key releases
	function keyRelease(e) {
		keys[e.keyCode] = false;
	};
	
	// FUNCTION: calculate the delta time, used for animation and physics
	function calculateDeltaTime() {
		var now, fps;
		now = (+new Date); 
		fps = 1000 / (now - lastTime);
		fps = clamp(fps, 12, 60);
		lastTime = now; 
		return 1/fps;
	};
	
	// return public interface for engine module
	return {
		init: init,
		paladin: paladin,
		ranger: ranger,
		magi: magi,
		setupGame: setupGame,
		setupLevel: setupLevel,
		loadAssets: loadAssets,
		playStream: playStream,
		update: update,
		pauseGame: pauseGame,
		resumeGame: resumeGame,
		requestFullscreen: requestFullscreen,
		keyPress: keyPress,
		keyRelease: keyRelease
	};
}());