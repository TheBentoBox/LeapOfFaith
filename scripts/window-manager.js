// window-manager.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.windowManager = (function(){
	console.log("Loaded window-manager.js module");
	var canvas;  // reference to game's canvas
	var ctx;     // 2D canvas context
	
	var uiElements = [];			// UI elements on the screen
	// FUNCTION: find named object in array
	uiElements.find = function(name){
		for(var i=0; i < this.length; i++){
			if(this[i].name == name){return this[i]};
		};
	};
	
	// FUNCTION: initalize canvas variables for window manager
	function init() {
		canvas = document.querySelector("canvas");	
		ctx = canvas.getContext("2d");				
		
		canvas.addEventListener("click", checkMouse);		// click event to check mouse on UI
		canvas.addEventListener("touchstart", checkMouse);	// tap event to check touch on UI
		
		updateAndDraw();
	}
	
	// FUNCTION: update and draw window
	function updateAndDraw(trackers){
		for(var i=0; i < uiElements.length; i++){
			uiElements[i].updateAndDraw(trackers);
		}
	}
	
	// FUNCTION: check clicks on UI
	function checkMouse(e){
		var mouse = getMouse(e);	// mouse position
		var elem;					// UI element
		var but;					// button
		var clicked = false;
		// check if any UI elements were clicked
		for(var i=0; i < uiElements.length; i++){
			elem = uiElements[i];
			//console.log("Element bounds: " + elem.position.x + ", " + elem.position.y + ", " + (elem.position.x + elem.size.x) + ", " + (elem.position.y + elem.size.y));
			if(mouse.position.x >= elem.position.x && mouse.position.x <= (elem.position.x + elem.size.x) && mouse.position.y >= elem.position.y && mouse.position.y <= (elem.position.y + elem.size.y)){
				clicked = true;
				// check if any buttons were clicked inside the clicked element
				for(var j=0; j < uiElements[i].buttons.length; j++){
					but = elem.buttons[j];
					if(mouse.position.x >= elem.position.x + but.offset.x && mouse.position.x <= elem.position.x + but.offset.x + but.size.x && mouse.position.y >= elem.position.y + but.offset.y && mouse.position.y <= elem.position.y + but.offset.y + but.size.y){
						// call click event of clicked button
						but.onClick();
						return clicked;
					}
				}
			}
		}
		//console.log(clicked);
		return clicked;
	}
	
	// FUNCTION: make new UI object
	function makeUI(name, xPos, yPos, width, height) {
		uiElements.push(new UI(name, xPos, yPos, width, height));
	}
	
	// FUNCTION: make a new button
	function makeButton(uiName, butName, offsetX, offsetY, width, height, clickEvent){
		uiElements.find(uiName).buttons.push(new button(uiName, butName, offsetX, offsetY, width, height, clickEvent));
	}
	
	// FUNCTION: make a new bar
	function makeBar(uiName, barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin){
		uiElements.find(uiName).bars.push(new bar(barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin));
	}
	
	// FUNCTION: modify UI variables
	function modifyUI(uiName, varName, args){
		var elem = uiElements.find(uiName);
		switch(varName){
			case("name"):
				elem.setName(args.name);
				break;
			case("position"):
				elem.setPosition(args.xPos, args,yPos);
				break;
			case("size"):
				elem.setSize(args.width, args.height);
				break;
			case("border"):
				elem.setBorder(args.color, args.width);
				break;
			case("fill"):
				elem.setFill(args.color);
				break;
			case("image"):
				elem.setImage(args.source);
				break;
		}
	}
	
	// FUNCTION: toggle UI
	function toggleUI(name){
		uiElements.find(name).toggleActive();
	}
	
	// FUNCTION: toggle whether UI pauses game when active
	function toggleUIPausing(name){
		uiElements.find(name).togglePause();
	}
	
	// FUNCTION: modify button variables
	function modifyButton(uiName, buttonName, varName, args){
		var but = uiElements.find(uiName).buttons.find(buttonName);
		switch(varName){
			case("name"):
				but.setName(args.name);
				break;
			case("offset"):
				but.setOffset(args.xPos, args,yPos);
				break;
			case("size"):
				but.setSize(args.width, args.height);
				break;
			case("border"):
				but.setBorder(args.color, args.width);
				break;
			case("fill"):
				but.setFill(args.color);
				break;
			case("image"):
				but.setImage(args.source);
				break;
			case("text"):
				but.setText(args.string, args.css, args.color);
				break;
			case("click"):
				but.setClick(args.event);
				break;
			case("hover"):
				but.setHover(args.event);
				break;
		}
	}
	
	// FUNCTION: toggle button
	function toggleButton(uiName, buttonName){
		uiElements.find(uiName).buttons.find(buttonName).toggleActive();
	}
	
	//FUNCTION: modify status bar variables
	function modifyBar(uiName, barName, varName, args){
		var bar = uiElements.find(uiName).bars.find(barName);
		switch(varName){
			case("name"):
				bar.setName(args.name);
				break;
			case("offset"):
				bar.setOffset(args.xPos, args,yPos);
				break;
			case("size"):
				bar.setSize(args.width, args.height);
				break;
			case("border"):
				bar.setBorder(args.color, args.width);
				break;
			case("fill"):
				bar.setFill(args.backColor, args.foreColor);
				break;
			case("image"):
				bar.setImage(args.backSource, args.foreSource);
				break;
			case("text"):
				bar.setText(args.string, args.css, args.color);
				break;
			case("target"):
				bar.setTarget(args.tgtVar, args.tgtMax, args.tgtMin);
		}
	}
	
	// FUNCTION: toggle bar
	function toggleBar(uiName, barName){
		uiElements.find(uiName).bars.find(barName).toggleActive();
	}
	
	// CLASS: user interface object
	var UI = function(name, xPos, yPos, width, height) {
		// element name
		this.name = name;
		
		// base position of UI element
		this.position = new Victor(xPos, yPos);
		
		// element size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "";			// background fill color
		this.image = new Image();		// background image
		this.isActive = false; 			// if the element is active and displayed
		this.doesPause = false; 		// if the element pauses the game when active
		
		this.buttons = [];			// array of contained buttons
		this.bars = [];				// array of status bars
		// FUNCTION: find named object in array
		this.buttons.find = this.bars.find = function(name){
			for(var i=0; i < this.length; i++){
				if(this[i].name == name){return this[i]};
			};
		};
		
		//{ UI MODIFIERS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		};
		
		// MUTATOR: set UI position
		this.setPosition = function(xPos, yPos){
			this.position = new Victor(xPos, yPos);
		};
		
		// MUTATOR: set up bounding rectangle
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		};
		
		// MUTATOR: set border
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};	// set color to "" to stop border drawing
		};
		
		// MUTATOR: set fill
		this.setFill = function(color){
			this.fillColor = color;		// set to "" to stop color fill
		};
		
		// MUTATOR: set background image
		this.setImage = function(source){
			this.image.src = source;		// set to "" to stop image drawing
		};
		
		// FUNCTION: toggle whether element is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		};
		
		// FUNCTION: toggle whether element pauses game
		this.togglePause = function(){
			this.doesPause = !this.doesPause;
		};
		//} UI MODIFIERS
		
		// FUNCTION: update and draw UI element
		this.updateAndDraw = function(trackers){
			if (this.isActive){
				// fill color
				if (this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
				}
				
				// draw image
				if(this.image.src != ""){
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
				
				// update tracked variables
				for(var i=0; i < trackers.length; i++){
					var b = this.bars.find(trackers[i].name);
					if(b != null){
						b.target.value = trackers[i].value;
					}
				}
				
				// update and draw buttons
				for(var i=0; i < this.buttons.length; i++){
					this.buttons[i].updateAndDraw()
				}
				
				// update and draw bars
				for(var i=0; i < this.bars.length; i++){
					this.bars[i].updateAndDraw()
				}
			}		
		};
	};
	
	// CLASS: button object
	var button = function(parentName, name, offsetX, offsetY, width, height, clickEvent) {
		// reference names
		this.parentName = parentName;
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
				var par = uiElements.find(this.parentName);
				// fill color
				if(this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// draw image
				if(this.image.src != ""){
					ctx.drawImage(this.image, par.position.x + this.offset.x, par.position.y + this.offset.y);
				}
				
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (par.position.x + this.offset.x + this.size.x / 2), (par.position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BUTTON FUNCTIONS
		// MUTATOR: set button name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set button offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Victor(offsetX, offsetY);
		}
		
		// MUTATOR: set button size
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		}
		
		// MUTATOR: set button border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set button color
		this.setFill = function(color){
			this.fillColor = color;
		}
		
		// MUTATOR: set button image
		this.setImage = function(source){
			this.image.src = source;
		}
		
		// MUTATOR: set button text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set button click event
		this.setClick = function(event){
			this.onClick = event;
		}
		
		// MUTATOR: set button hover event
		this.setHover = function(event){
			this.onHover = event;
		}
		
		// FUNCTION: toggle whether button is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		//} BUTTON FUNCTIONS
	};
	
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
		
		// fill colors
		this.color = {
			back: "gray",
			fore: "green",
		}
		
		// fill images
		this.image = {
			back: new Image(),
			fore: new Image()
		}
		
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
					ctx.fillStyle = this.color.back;
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
					ctx.fillStyle = this.color.fore;
					ctx.fillRect(position.x + this.offset.x, position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				
				// draw background image
				if(this.image.back.src != ""){
					ctx.drawImage(this.image.back, position.x + this.offset.x, position.y + this.offset.y);
				}
				
				// draw foreground image
				if(this.image.fore.src != ""){
					ctx.drawImage(this.image.fore, 0, 0, this.size.x * percent, this.size.y, position.x + this.offset.x, position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (postition.x + this.offset.x + this.size.x / 2), (position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BAR FUNCTIONS
		// MUTATOR: set bar name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set bar offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Victor(offsetX, offsetY);
		}
		
		// MUTATOR: set bar size
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		}
		
		// MUTATOR: set bar border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set bar color
		this.setFill = function(backColor, foreColor){
			this.color = {back: backColor, fore: foreColor};
		}
		
		// MUTATOR: set bar image
		this.setImage = function(backSource, foreSource){
			this.image.back.src = backSource;
			this.image.fore.src = foreSource;
		}
		
		// MUTATOR: set bar text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set bar target
		this.setTarget = function(tgtVar, tgtMax, tgtMin){
			this.target = {value: tgtVar, max: tgtMax, min: tgtMin};
		}
		
		// FUNCTION: toggle whether bar is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		//} BAR FUNCTIONS
	}

	return {
		init: init,
		updateAndDraw: updateAndDraw,
		checkMouse: checkMouse,
		makeUI: makeUI,
		makeButton: makeButton,
		makeBar: makeBar,
		modifyUI: modifyUI,
		toggleUI: toggleUI,
		toggleUIPausing: toggleUIPausing,
		modifyButton: modifyButton,
		toggleButton: toggleButton,
		modifyBar: modifyBar,
		toggleBar: toggleBar
	}
}());