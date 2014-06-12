var minimap = {
    init: function(mapDict) {
	var mapWidth = Space.WIDTH + (Space.WIDTH * 3/4 * world.maxX);
	var mapHeight = Space.HEIGHT * (world.maxY + 1);

	world.minimap = new createjs.Stage("minimap");

	this.spaceWidth = world.minimap.canvas.width / (world.maxX + 1);
	this.spaceHeight = world.minimap.canvas.height / (world.maxY + 1.5);

	for(var i in mapDict) {
	    var space = world.getSpaceByCoords(i);

	    var color = space.terrain.color;

	    var minispace = new createjs.Shape();
	    var minicoords = this.gridCoordsToMiniPixels(space);

	    minispace.x = minicoords.x;
	    minispace.y = minicoords.y;
	    minispace.graphics.beginFill(color).drawRect(0, 0, this.spaceWidth, this.spaceHeight);
	    world.minimap.addChild(minispace);
        }
	world.minimap.update();
    },
    gridCoordsToMiniPixels: function(x,y) {
	if("x" in x) {
	    var inputCoords = x;
	    var x = inputCoords.x;
	    var y = inputCoords.y;
	}
	else if(typeof x == "string") { var coords = x.split(","); x = +coords[0]; y = +coords[1]; }

	var output = {};
	output.x = this.spaceWidth * x;
	output.y = this.spaceHeight * y + (x%2?0:this.spaceHeight/2);

	return output;
    }
};