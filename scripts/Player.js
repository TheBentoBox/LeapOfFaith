// CLASS: player object
game.Player = (function(order) {
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
}());