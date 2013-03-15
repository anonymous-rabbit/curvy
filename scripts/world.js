"use strict";

/**
 * Creates a world
 * 
 * @returns {World}
 */
self.World = function() {
	var self = this;
	
	this.length = 20;
	this.width = 14;
	this.height = 8;
	this.max = vec3.fromValues(this.width/2, this.height/2, this.length/2);
	this.min = vec3.negate(vec3.create(), this.max);
	
	this.ball = new Ball(this);
	this.ball.position = vec3.fromValues(0, 0, this.length / 2 - this.ball.radius)
	
	this.camera = new Camera(this);
	this.camera.position = vec3.fromValues(0, 0, this.length / 2 + 8);
	//this.camera.position = vec3.fromValues(0, this.height + 20, 0);
	//this.camera.rotation = vec3.fromValues(Math.PI / 2, 0, 0);
	
	this.room = new Room(this, this.width, this.height, this.length);	
	
	this.paddle = new Paddle(this);
	this.paddle.position = vec3.fromValues(0, 0, this.length / 2);
	
	this.update = function(elapsed, input) {
		self.ball.update(elapsed);
	};
	
	this.render = function(r) {
		self.ball.render(r);
		self.room.render(r);
		self.paddle.render(r);
	};
};
