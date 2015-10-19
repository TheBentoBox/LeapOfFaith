// ui.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

// CLASS: user interface object
var UI = function(xPos, yPos, width, height) {
	// grab context of engine
	var ctx = game.engine.ctx;
	
	// base position of UI element
	var position = new Victor(xPos,yPos,);
	
	// element size
	var size = new Victor(width, height);
	
	// border styling
	var border = {
		color: "",
		width: 0,
	};
	
	var fillColor = "";			// background fill color
	var image = new Image();	// background image
	var isActive = false; 		// if the element is active and displayed
	var doesPause = false; 		// if the element pauses the game when active
	
	var buttons = [];			// array of contained buttons
	var bars = [];				// array of status bars
	// FUNCTION: find named object in array
	buttons.find = bars.find = function(name){
		for(var i=0; i < this.length; i++){
			if(this[i].name == name){return this[i]};
		};
	};
	
	//{ UI MODIFIERS
	// MUTATOR: set UI position
	function setPosition(xPos, yPos){
		position = new Victor(xPos,yPos,);
	};
	
	// MUTATOR: set up bounding rectangle
	function setSize(width, height){
		size = new Victor(width, height);
	};
	
	// MUTATOR: set border
	function setBorder(color, width){
		border = {color:color, width:width};	// set color to "" to stop border drawing
	};
	
	// MUTATOR: set fill
	function setFill(color){
		fillColor = color;		// set to "" to stop color fill
	};
	
	// MUTATOR: set background image
	function setImage(source){
		image.src = source;		// set to "" to stop image drawing
	};
	
	// FUNCTION: toggle whether element is active
	function toggleActive(){
		isActive = !isActive;
	};
	
	// FUNCTION: toggle whether element pauses game
	function togglePause(){
		doesPause = !doesPause;
	};
	//} UI MODIFIERS
	
	// FUNCTION: update and draw UI element
	function updateAndDraw(trackers){
		if (isActive){
			// fill color
			if (fillColor != ""){
				ctx.fillStyle = fillColor;
				ctx.fillRect(position.x, position.y, size.x, size.y);
			}
			
			// stroke border
			if(border.color != ""){
				ctx.strokeStyle = border.color;
				ctx.lineWidth = border.width;
				ctx.strokeRect(position.x, position.y, size.x, size.y);
			}
			
			// draw image
			if(image.src != ""){
				ctx.drawImage(image, position.x, position.y);
			}
			
			// update tracked variables
			for(var i=0; i < trackers.length; i++){
				var b = bars.find(trackers[i].name);
				if(b != null){
					b.target.value = trackers[i].value;
				}
			}
			
			// update and draw buttons
			for(var i=0; i < buttons.length; i++){
				buttons[i].updateAndDraw()
			}
			
			// update and draw bars
			for(var i=0; i < bars.length; i++){
				bars[i].updateAndDraw()
			}
		}		
	};
	
	// CLASS: button object
	var button = function(name, offsetX, offsetY, width, height, clickEvent) {
		// reference name
		this.name = name;
		
		// offset from base UI element
		this.offset = new Victor(offsetX, offsetY);
		
		// button size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "gray";		// background fill color
		this.image = new Image();		// background image
		this.isActive = false; 			// if the element is active and displayed
		
		// text on button
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		this.onClick = clickEvent;		// event to fire on click
		this.onHover = undefined;		// event to fire on hover
		
		// FUNCTION: update and draw button if active
		this.updateAndDraw = function() {
			if (this.isActive){		
				// fill color
				if(this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// draw image
				if(this.image.src != ""){
					ctx.drawImage(this.image, position.x + this.offset.x, position.y + this.offset.y);
				}
				
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (postition.x + this.offset.x + this.size.x / 2), (position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
	};
	//{ BUTTON FUNCTIONS
	// FUNCTION: make a new button
	function makeButton(name, offsetX, offsetY, width, height, clickEvent) {
		buttons.push(new button(name, offsetX, offsetY, width, height, clickEvent));
	}
	
	// MUTATOR: set button name
	function setButName(name, newName){
		buttons.find(name).name = newName;
	}
	
	// MUTATOR: set button offset
	function setButOffset(name, xOffset, yOffset){
		buttons.find(name).offset = new Victor(offsetX, offsetY);
	}
	
	// MUTATOR: set button size
	function setButSize(name, width, height){
		buttons.find(name).size = new Victor(width, height);
	}
	
	// MUTATOR: set button border styling
	function setButBorder(name, color, width){
		buttons.find(name).border = {color:color, width:width};
	}
	
	// MUTATOR: set button color
	function setButFill(name, color){
		buttons.find(name).fillColor = color;
	}
	
	// MUTATOR: set button image
	function setButImage(name, source){
		buttons.find(name).image.src = source;
	}
	
	// MUTATOR: set button text
	function setButText(name, string, css, color){
		buttons.find(name).text = {string:string, css:css, color:color};
	}
	
	// MUTATOR: set button click event
	function setButClick(name, event){
		buttons.find(name).onClick = event;
	}
	
	// MUTATOR: set button hover event
	function setButHover(name, event){
		buttons.find(name).onHover = event;
	}
	
	// FUNCTION: toggle whether button is active
	function toggleButActive(name){
		buttons.find(name).isActive = !buttons.find(name).isActive;
	}
	//} BUTTON FUNCTIONS

	// CLASS: status bar object
	var bar = function(name, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin) {
		// reference name
		this.name = name;
		
		// offset from base UI element
		this.offset = new Victor(offsetX, offsetY);
		
		// bar size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.backColor = "gray";		// background fill color
		this.foreColor = "green";		// foreground fill color
		this.backImage = new Image();	// background image
		this.foreImage = new Image();	// foreground image
		this.isActive = false; 			// if the element is active and displayed
		
		// variable to be tracked by bar
		this.target = {
			value: tgtVar,
			max: tgtMax,
			min: tgtMin,
		}
		
		// text on bar
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		// FUNCTION: update and draw bar if active
		this.updateAndDraw = function() {
			if (this.isActive){		
				// percent fill of bar
				percent = clamp(this.target.value / (this.target.max - this.target.min), 0.0, 1.0);
				
				// fill background color
				if(this.backColor != ""){
					ctx.fillStyle = this.backColor;
					ctx.fillRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// fill foreground color
				if(this.foreColor != ""){
					ctx.fillStyle = this.foreColor;
					ctx.fillRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				
				// draw background image
				if(this.backImage.src != ""){
					ctx.drawImage(this.backImage, position.x + this.offset.x, position.y + this.offset.y);
				}
				
				// draw foreground image
				if(this.foreImage.src != ""){
					ctx.drawImage(this.foreImage, 0, 0, this.size.x * percent, this.size.y, position.x + this.offset.x, position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (postition.x + this.offset.x + this.size.x / 2), (position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
	}
};