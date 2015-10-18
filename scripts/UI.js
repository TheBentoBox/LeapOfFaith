// create game object if there is none
game = game || {}

// CLASS: user interface object
game.UI = (function(xPos, yPos, width, height) {
	// base position of UI element
	this.position = {
		x: xPos,
		y: yPos,
	};
	
	// element size
	this.size = {
		x: width,
		y: height,
	}
	
	// border styling
	this.border = {
		color: "",
		width: 0,
	}
	this.fillColor = "";		// background fill color
	this.image = "";			// background image
	this.isActive = false; 		// if the element is active and displayed
	this.doesPause = false; 	// if the element pauses the game when active
	
	// MUTATOR: set UI position
	this.setPosition = function(xPos, yPos){
		this.position.x = xPos;
		this.position.y = yPos;
	};
	
	//MUTATOR: set up bounding rectangle
	this.setSize = function(width, height){
		this.size.x = width;
		this.size.y = height;
	}
	
	// MUTATOR: set border
	this.setBorder = function(color, width){
		this.border.color = color;	// set to "" to stop border drawing
		this.border.width = width;
	}
	
	// MUTATOR: set fill
	this.setFill = function(color){
		this.fillColor = color;		// set to "" to stop color fill
	}
	
	// MUTATOR: set background image
	this.setImage = function(image){
		this.image = image;			// set to "" to stop image drawing
	}
	
	// FUNCTION: toggle whether element is active
	this.toggleActive = function(){
		this.isActive = !this.isActive;
	};
	
	// FUNCTION: toggle whether element pauses game
	this.togglePause = function(){
		this.doesPause = !this.doesPause;
	};
	
	
}())