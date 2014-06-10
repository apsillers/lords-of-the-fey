var minimap = {
    init: function(mapDict) {
	var mapWidth = Space.WIDTH + (Space.WIDTH * 3/4 * world.maxX);  //world.mapContainer.getBounds().width;
	var mapHeight = Space.HEIGHT * (world.maxY + 1); //world.mapContainer.getBounds().height;

	world.minimap = new createjs.Stage("minimap");

	var spaceWidth = world.minimap.canvas.width / (world.maxX + 1);
	var spaceHeight = world.minimap.canvas.height / (world.maxY + 1.5);

	for(var i in mapDict) {
	    var space = world.getSpaceByCoords(i);

	    var color = space.terrain.color;

	    var minispace = new createjs.Shape();
	    minispace.x = spaceWidth * space.x;
	    minispace.y = spaceHeight * space.y + (space.x%2?0:spaceHeight/2);;
	    minispace.graphics.beginFill(color).drawRect(0, 0, spaceWidth, spaceHeight);
	    world.minimap.addChild(minispace);
        }
	world.minimap.update();
    }
};