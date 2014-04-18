function World(canvasName) {
    this.stage = new createjs.Stage(canvasName);
    this.stage.enableMouseOver(20);
    this.baseTerrain = new createjs.Container();
    this.grid = {};
    this.units = {};
}
World.prototype = {
    initGrid: function(mapDict) {
        for(var i in mapDict) {
            var coords = i.split(",");
            this.addSpace(new Space({ x:+coords[0], y:+coords[1], terrain: mapDict[i].terrain }));
        }
	this.stage.addChild(this.baseTerrain);
	world.stage.setChildIndex(this.baseTerrain, 0);
        this.stage.update();
    },
    
    addSpace: function(space) {
        this.grid[space.x+","+space.y] = space;
        this.baseTerrain.addChild(space.shape);
        this.stage.addChild(space.overlayShape);
    },
    
    getSpaceByCoords: function(x, y) {
        if(y == undefined) {
            if(typeof x == "object" && x.x != undefined && x.y != undefined) {
                return this.grid[x.x+","+x.y]
            }
            return this.grid[x];
        }
        
        return this.grid[x+","+y];
    },
    
    getNeighbors: function(space) {
        var neighbors = [];
        
        var x = space.x, y = space.y;
        
        // -1 if odd, +1 if even
        var offset = 1 - (x % 2) * 2;
        var coords = [(x-1)+","+(y+offset), x+","+(y+offset), (x+1)+","+(y+offset), (x-1)+","+y, x+","+(y-offset), (x+1)+","+y];
        
        for(var i=0; i<coords.length; ++i) {
            var prospect = this.getSpaceByCoords(coords[i]);
            if(prospect && prospect != space) { neighbors.push(prospect); }
        }
        return neighbors;
    },
    
    addUnit: function(unit, space) {
        unit.shape.x = space.shape.x - 1;
        unit.shape.y = space.shape.y - 1;
        
        unit.x = space.x;
        unit.y = space.y;
        this.units[unit.x+","+unit.y] = unit;
        
        world.stage.addChild(unit.shape);
        world.stage.update();
    },

    positionUnit: function(unit, spaceCoords) {
	delete world.units[unit.x+","+unit.y];

	unit.x = spaceCoords.x;
	unit.y = spaceCoords.y;

	world.units[unit.x+","+unit.y] = unit;
    },

    removeUnit: function(unit) {
	delete this.units[unit.x+","+unit.y];
        
        world.stage.removeChild(unit.shape);
        world.stage.update();
    },
    
    moveUnit: function(unit, path, attackIndex) {
        ui.moveHappening = true;

        socket.emit("move", {
            gameId: gameInfo.gameId,
            path: path.map(function(a) { return {x:a.space.x, y:a.space.y};}),
	    attackIndex: attackIndex
        });
    },
    
    getUnitAt: function(space) {
        return this.units[space.x+","+space.y];
    }
}

function Space(options) {
    this.x = options.x;
    this.y = options.y;
    this.shape = options.shape;
    this.terrain = options.terrain;
    this.unit = null;
    
    if(!options.shape) {
        this.setShape(options.terrain);
    }
}
Space.WIDTH = 70;
Space.HEIGHT = 70;
Space.prototype = {
    width: Space.WIDTH,
    height: Space.HEIGHT,
    padding: Space.PADDING,
    toString: function() { return this.x + "," + this.y; },
    
    setShape: function(terrain) {
        this.shape = new createjs.Container();
	this.baseShape = new createjs.Bitmap(terrain.imgObj);
	this.shape.addChild(this.baseShape);

	this.baseShape.owner = this;
        this.shape.x = this.x * Math.ceil(this.width * 3/4 + 1);
        this.shape.y = this.y * (this.height) + (this.x%2?0:this.height/2);
        this.baseShape.addEventListener("click", ui.onSpaceClick);
        this.baseShape.addEventListener("rollover", ui.onSpaceHover);

	if(terrain.overlayImgObj) {
	    var overlay = new createjs.Bitmap(terrain.overlayImgObj);
	    overlay.x = this.x * Math.ceil(this.width * 3/4 + 1) - overlay.image.width / 4;
	    overlay.y = this.y * (this.height) + (this.x%2?0:this.height/2) - overlay.image.height/4;
	    this.overlayShape = overlay;
	    this.overlayShape.owner = this;
        }
    }
}
