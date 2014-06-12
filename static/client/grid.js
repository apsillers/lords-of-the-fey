function World(canvasName) {
    this.stage = new createjs.Stage(canvasName);
    this.stage.enableMouseOver(20);
    createjs.Touch.enable(this.stage);
    this.mapContainer = new createjs.Container();
    this.baseTerrain = new createjs.Container();
    this.grid = {};
    this.units = {};

    this.stage.addEventListener("pressmove", function(e) {
	if(e.primary) {
	    if(world.scrollPointerX) {
		if(Math.abs(world.scrollPointerX - e.stageX) > 10 || Math.abs(world.scrollPointerY - e.stageY) > 10) {
		    scroll.applyScroll(world.scrollPointerX - e.stageX, world.scrollPointerY - e.stageY);
		    clearTimeout(world.noMoveTimeout);
		}
	    }
	    world.scrollPointerX = e.stageX;
	    world.scrollPointerY = e.stageY;
	}
    });

    this.stage.addEventListener("pressup", function(e) {
	clearTimeout(world.noMoveTimeout);

	delete world.scrollPointerX;
	delete world.scrollPointerY;
    });

}
World.prototype = {
    initGrid: function(mapDict) {
	this.maxX = 0;
	this.maxY = 0;

        for(var i in mapDict) {
            var coords = i.split(",");
            this.addSpace(new Space({ x:+coords[0], y:+coords[1], terrain: mapDict[i].terrain }));

	    this.maxX = Math.max(this.maxX, +coords[0]);
	    this.maxY = Math.max(this.maxY, +coords[1]);
        }

	this.mapContainer.addChild(this.baseTerrain);
	this.mapContainer.setChildIndex(this.baseTerrain, 0);
        this.stage.addChild(this.mapContainer);
	this.resizeCanvasToWindow();
	this.stage.update();

	minimap.init(mapDict);
    },

    resizeCanvasToWindow: function() {
	this.stage.canvas.height = $(window).height() - $("#top-bar").height() - 6;
	this.stage.canvas.width = $(window).width() - $("#right-column").width() - 21;
	$("#top-bar").width($(window).width() - 3);
	this.stage.update();

	if(this.minimap) { minimap.drawViewBox(); }
    },
    
    addSpace: function(space) {
        this.grid[space.x+","+space.y] = space;
        this.baseTerrain.addChild(space.shape);
        this.mapContainer.addChild(space.overlayShape);
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
	var coords = Terrain.getNeighborCoords(space);
        
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
        
        world.mapContainer.addChild(unit.shape);
        world.stage.update();

	// add unit to minimap
	var miniPixels = minimap.gridCoordsToMiniPixels(space);
	unit.minishape.x = miniPixels.x;
	unit.minishape.y = miniPixels.y;
	world.minimap.addChild(unit.minishape);
	world.minimap.update();
    },

    positionUnit: function(unit, spaceCoords) {
	delete world.units[unit.x+","+unit.y];

	unit.x = spaceCoords.x;
	unit.y = spaceCoords.y;

	world.units[unit.x+","+unit.y] = unit;

	var miniPixels = minimap.gridCoordsToMiniPixels(spaceCoords);
	unit.minishape.x = miniPixels.x;
	unit.minishape.y = miniPixels.y;
	world.minimap.update();
    },

    removeUnit: function(unit) {
	delete this.units[unit.x+","+unit.y];
        
        world.mapContainer.removeChild(unit.shape);
        world.stage.update();

	world.minimap.removeChild(unit.minishape);
	world.minimap.update();
    },
    
    moveUnit: function(unit, path, attackIndex) {
        ui.moveHappening = true;

        socket.emit("move", {
            gameId: gameInfo.gameId,
            path: path.map(function(a) { return {x:a.space.x, y:a.space.y};}),
	    attackIndex: attackIndex
        });
    },
    
    getUnitAt: function(x, y) {
        if(y == undefined) {
            if(typeof x == "object" && x.x != undefined && x.y != undefined) {
                return this.units[x.x+","+x.y]
            }
            return this.units[x];
        }
        
        return this.units[x+","+y];
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
Space.passthroughFunc = function(e) {
    if(!e.target.owner) { e.target = e.target.parent; }
    e.target = world.getSpaceByCoords(e.target.owner).shape;
    e.target.dispatchEvent(e);
};
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
	this.shape.owner = this;
        this.shape.x = this.x * Math.ceil(this.width * 3/4 + 1);
        this.shape.y = this.y * (this.height) + (this.x%2?0:this.height/2);

        this.shape.addEventListener("mousedown", function(e) { 
	    if((e.target instanceof createjs.Bitmap)) { e.target = e.target.parent; }

	    world.noMoveTimeout = setTimeout(function() {
		ui.onContextMenu(e.target.owner, { x: e.stageX, y: e.stageY });
	    }, 1000);
	});

        this.shape.addEventListener("click", function(e) { 
	    if((e.target instanceof createjs.Bitmap)) { e.target = e.target.parent; }

	    if(!ui.pathSource || ui.hoverSpace == e.target.owner) {
		ui.onSpaceClick(e);
	    }

	    ui.onSpaceHover(e);
	});

        this.shape.addEventListener("rollover", ui.onSpaceHover);

	if(terrain.overlayImgObj) {
	    var overlay = new createjs.Bitmap(terrain.overlayImgObj);
	    overlay.x = this.x * Math.ceil(this.width * 3/4 + 1) - overlay.image.width / 4;
	    overlay.y = this.y * (this.height) + (this.x%2?0:this.height/2) - overlay.image.height/4;
	    this.overlayShape = overlay;
	    this.overlayShape.owner = this;
	    this.overlayShape.addEventListener("click", Space.passthroughFunc);
	    this.overlayShape.addEventListener("rollover", Space.passthroughFunc);
        }
    },

    setVillageFlag: function(team) {
	if(this.flag) { world.mapContainer.removeChild(this.flag); }
	this.flag = new createjs.Shape();
	this.flag.graphics.beginFill(["rgba(0,0,0,0)","#F00","#00F","#F0F"][team]).rect(this.shape.x, this.shape.y, 15, 10);
	world.mapContainer.addChild(this.flag);
	world.stage.update();
    }
}
