"use strict";

// get mouse pos on canvas
function getMouse(e){
	var mouse = {}
	mouse.x = e.pageX - e.target.offsetLeft;
	mouse.y = e.pageY - e.target.offsetTop;
	return mouse;
};

// returns random within a range
function rand(min, max) {
  	return Math.random() * (max - min) + min;
};

// returns a value that is constrained between min and max (inclusive)
function clamp(val, min, max){
	return Math.max(min, Math.min(max, val));
};

// fills a text with correct CSS and cleans up after itself
function fillText(ctx, string, x, y, css, color) {
	ctx.save();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
};

function rectangleContainsPoint(rect, point) {
	if (rect.width <= 0 || rect.height <= 0) {
		return false;
	}
	
	return (point.x >= rect.x && point.x <= rect.x + rect.width &&
			point.y >= rect.y && point.y <= rect.y + rect.height);
};

 // activate fullscreen
function requestFullscreen(element) {
	if (element.requestFullscreen) {
	  element.requestFullscreen();
	} else if (element.mozRequestFullscreen) {
	  element.mozRequestFullscreen();
	} else if (element.mozRequestFullScreen) { 
	  element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
	  element.webkitRequestFullscreen();
	}
	// no response if unsupported
};

// This gives Array a randomElement() method
Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}