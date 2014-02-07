var Terrain = {
    types: {
        GRASS: { symbol: "Gg", name: "grass", img: "/data/img/terrain/green.png", toString: function() { return this.name; } },
        SWAMP: { symbol: "Sw", name: "swamp", img: "/data/img/terrain/water.png", toString: function() { return this.name; } },
        DIRT: { symbol: "Re", name: "dirt", img: "/data/img/terrain/dirt.png", toString: function() { return this.name; } },
    },

    getTerrainBySymbol: function(symbol) {
        for(var prop in this.types) {
            if(this.types[prop].symbol == symbol) {
                return this.types[prop];
            }
        }
    }
}

function World(canvasName) {
    this.stage = new createjs.Stage(canvasName);
    this.stage.enableMouseOver(20);
    this.grid = {};
    this.units = {};
}
World.prototype = {
    initGrid: function(mapDict) {
        for(var i in mapDict) {
            var coords = i.split(",");
            this.addSpace(new Space({ x:+coords[0], y:+coords[1], terrain: mapDict[i].terrain }));
        }
        this.stage.update();
    },
    
    addSpace: function(space) {
        this.grid[space.x+","+space.y] = space;
        this.stage.addChild(space.shape);
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
    
    moveUnit: function(unit, path, callback) {
        ui.moveHappening = true;

        socket.emit("move", {
            gameId: 1,
            path: path.map(function(a) { return {x:a.space.x, y:a.space.y};})
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
        this.shape =  new createjs.Bitmap(terrain.imgObj);
        this.shape.owner = this;
        this.shape.x = this.x * (this.width * 3/4 + 1);
        this.shape.y = this.y * (this.height) + (this.x%2?0:this.height/2);
        this.shape.addEventListener("click", onSpaceClick);
        this.shape.addEventListener("mouseover", onSpaceHover);
    }
}

var pathSource = null;
var pathTarget = null;
var pathShape = null;
var path = null;

function onSpaceHover(e) {
    var space = e.target.owner;
    
    if(pathSource && space != pathTarget) {
        pathTarget = space;
	
        path = aStar(world, world.getUnitAt(pathSource), pathSource, pathTarget);
        world.stage.removeChild(pathShape);
        
        pathShape = new createjs.Container();
        for(var i=0;i<path.length;++i){
            var s = path[i].space;
            var pip = new createjs.Container();
            pip.x = s.shape.x + 17;
            pip.y = s.shape.y + 16;
                var bar = new createjs.Shape();
                bar.graphics.beginFill("rgba(128,128,200,0.7)").drawRect(0, 0, 38, 38);
                bar.regX = 0;
                bar.regY = 0;
                pip.addChild(bar);
                
            pathShape.addChild(pip);
        }
        world.stage.addChild(pathShape);
        world.stage.update();
    }

    // show a unit's stats in the right side area
    var hoveringUnit = world.getUnitAt(space);
    if(hoveringUnit) {
        $("#right_data_image").attr("src", hoveringUnit.img);
        $("#right_data_hp").html(hoveringUnit.hp + "/" + hoveringUnit.maxHp);
        $("#right_data_xp").html(hoveringUnit.xp + "/" + hoveringUnit.maxXp);
        $("#right_data_name").html(hoveringUnit.name);
    }
}

var debugTeamToggle = true;

function onSpaceClick(e) {
    var space = e.target.owner;

    if(e.nativeEvent.button == 2) {
	if(debugTeamToggle) {
	    socket.emit("create", { gameId: 1, team: 1, type: "scout", x: space.x, y: space.y });
	} else {
	    socket.emit("create", { gameId: 1, team: 2, type: "grunt", x: space.x, y: space.y });
	}
	debugTeamToggle = !debugTeamToggle;
	return;
    }

    if(!pathSource && !ui.moveHappening) {
        if(world.getUnitAt(space)) {
            pathSource = space;
        }
    } else {
        world.stage.removeChild(pathShape);
        
        if(space != pathSource) {
            var unit = world.getUnitAt(pathSource);
            world.moveUnit(unit, path, function() { console.log("move complete"); });
        }

        pathSource = null;
        world.stage.update();
    }
}
