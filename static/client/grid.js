/**
    Copyright 2014 Andrew P. Sillers

    This file is part of Lords of the Fey.

    Lords of the Fey is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Lords of the Fey is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Lords of the Fey.  If not, see <http://www.gnu.org/licenses/>.
*/
function World(canvasName) {
    var stage = this.stage = new createjs.Stage(canvasName);
    createjs.Ticker.on("tick", function (event) {
        stage.update(event);
    });

    this.stage.enableMouseOver(83);
    createjs.Touch.enable(this.stage);
    this.mapContainer = new createjs.Container();
    this.baseTerrain = new createjs.Container();
    this.transitionTerrain = new createjs.Container();
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

        setTimeout(function() {
            ui.justMadeContextMenu = false;
        }, 200);

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

        this.mapWidth = Space.WIDTH + ((Space.WIDTH * 3/4 + 0.6) * (this.maxX));
        this.mapHeight = Space.HEIGHT * (this.maxY + 1.5);

        this.drawTransitions();

        this.mapContainer.addChild(this.baseTerrain);
        this.mapContainer.addChild(this.transitionTerrain);
        this.mapContainer.setChildIndex(this.baseTerrain, 0);
        this.mapContainer.setChildIndex(this.transitionTerrain, 1);
        this.stage.addChild(this.mapContainer);

        //this.baseTerrain.cache(0,0,this.mapWidth,this.mapHeight);
        //this.transitionTerrain.cache(0,0,this.mapWidth,this.mapHeight);

        this.resizeCanvasToWindow();
        this.stage.update();

        minimap.init(mapDict);
    },

    resizeCanvasToWindow: function() {
        this.stage.canvas.height = $(window).height() - $("#top-bar").height() - 6;
        this.stage.canvas.height = Math.max(this.stage.canvas.height, $("#right-column").height());
        this.stage.canvas.width = $(window).width() - $("#right-column").width() - 21;
        $("#top-bar").width($(window).width() - 3);

        ui.resizeModalWallToCanvas();
        this.stage.update();

        if(this.minimap) { minimap.drawViewBox(); }
    },
    
    addSpace: function(space) {
        this.grid[space.x+","+space.y] = space;
        this.baseTerrain.addChild(space.shape);
        this.mapContainer.addChild(space.overlayShape);
    },
    
    getSpaceByCoords: function(x, y) {
        if(x == "hidden") { return undefined; }

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
        var coords = mapUtils.Terrain.getNeighborCoords(space);
        
        for(var i=0; i<coords.length; ++i) {
            var prospect = this.getSpaceByCoords(coords[i]);
            if(prospect && prospect != space) { neighbors.push(prospect); }
        }
        return neighbors;
    },

    getDirection: function(s1, s2) {
        return mapUtils.Terrain.getDirection(s1, s2);
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
        // insert minimap unit under the minimap view box frame
        world.minimap.setChildIndex(unit.minishape, world.minimap.children.length - 2);
        world.minimap.update();

        ui.updateOwnedUnitsCount();
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

        ui.updateOwnedUnitsCount();
    },
    
    moveUnit: function(unit, path, attackIndex) {
        ui.moveHappening = true;

        socket.emit("move", {
            gameId: gameInfo.gameId,
            path: path.map(function(a) { return {x:a.space.x, y:a.space.y};}),
            attackIndex: attackIndex,
            anonToken: gameInfo.anonToken
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
    },

    drawTransitions: function() {
        var Terrain = mapUtils.Terrain;
        for(var coords in this.grid) {
            var space = this.grid[coords];
            var neighbors = this.getNeighbors(space);
            for(var i=0; i<neighbors.length; ++i) {
                var n = neighbors[i];
                if(n.terrain.tileType != space.terrain.tileType &&
                   Terrain.transitionRank.indexOf(n.terrain.tileType) > Terrain.transitionRank.indexOf(space.terrain.tileType) &&
                   n.terrain.tileType in Terrain.transitions) {
                    var dir = Terrain.getDirection(space, n);
                    if(dir in Terrain.transitions[n.terrain.tileType].imgObjs) {
                        var transImgObj = Terrain.transitions[n.terrain.tileType].imgObjs[dir];
                        var trans = new createjs.Bitmap(transImgObj);
                        trans.x = space.shape.x;
                        trans.y = space.shape.y;
                        this.transitionTerrain.addChild(trans);
                    }
                }
            }
        }
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
        this.shape.x = this.x * Math.ceil(this.width * 3/4);
        this.shape.y = this.y * (this.height) + (this.x%2?0:this.height/2);

        this.shape.addEventListener("mousedown", function(e) { 
            if((e.target instanceof createjs.Bitmap)) { e.target = e.target.parent; }

            world.noMoveTimeout = setTimeout(function() {
                ui.onContextMenu(e.target.owner, { x: e.stageX, y: e.stageY });
                ui.justMadeContextMenu = true;
            }, 1000);
        });

        this.shape.addEventListener("click", function(e) { 
            if((e.target instanceof createjs.Bitmap)) { e.target = e.target.parent; }

            if(!ui.pathSource || ui.hoverSpace == e.target.owner) {
                ui.onSpaceClick(e);
            }

            ui.onSpaceHover(e);
        });

        /* helpful for debugging pathing issues */
        this.debugText = new createjs.Text("");
        this.debugText.x = 30;
        this.debugText.y = 30;
        this.shape.addChild(this.debugText);

        this.shape.addEventListener("rollover", ui.onSpaceHover);

        if(terrain.overlayImgObj) {
            var overlay = new createjs.Bitmap(terrain.overlayImgObj);
        if(overlay.image.width == 72) {
                overlay.x = this.x * Math.ceil(this.width * 3/4);
                overlay.y = this.y * (this.height) + (this.x%2?0:this.height/2);
        } else {
                overlay.x = this.x * Math.ceil(this.width * 3/4) - overlay.image.width / 4;
                overlay.y = this.y * (this.height) + (this.x%2?0:this.height/2) - overlay.image.height/4;
        }
            this.overlayShape = overlay;
            this.overlayShape.owner = this;
            this.overlayShape.addEventListener("click", Space.passthroughFunc);
            this.overlayShape.addEventListener("rollover", Space.passthroughFunc);
        }
    },

    setVillageFlag: function(team) {
        var color = ["rgba(0,0,0,0)","#F00","#00F","#F0F", "#444"][team];

        if(this.flag) { world.mapContainer.removeChild(this.flag); }
        this.flag = new createjs.Shape();
        this.flag.graphics.beginFill(color).rect(this.shape.x, this.shape.y, 15, 10);
        world.mapContainer.addChild(this.flag);
        world.stage.update();

        if(this.miniflag) { world.minimap.removeChild(this.miniflag); }
        this.miniflag = new createjs.Shape();
        this.miniflag.graphics.beginFill(color).drawRect(0, 0, minimap.spaceWidth, minimap.spaceHeight);
        var miniPixels = minimap.gridCoordsToMiniPixels(this);
        this.miniflag.x = miniPixels.x;
        this.miniflag.y = miniPixels.y;
        world.minimap.addChild(this.miniflag);
        world.minimap.setChildIndex(this.miniflag, world.minimap.children.length - 2);
        world.minimap.update();

        gameInfo.villages[this.x+","+this.y] = team;
        ui.updateVillageStats();
    }
}
