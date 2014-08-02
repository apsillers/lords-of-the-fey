var minimap = {
    init: function(mapDict) {
        world.minimap = new createjs.Stage("minimap");

        this.width = world.minimap.canvas.width;
        this.height = world.minimap.canvas.height;

        this.spaceWidth = this.width / (world.maxX + 1);
        this.spaceHeight = this.height / (world.maxY + 1.5);

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

        this.drawViewBox();
        
        world.minimap.on("click", this.onClick, this);

        world.minimap.update();
    },

    drawViewBox: function() {
        if(this.box) { world.minimap.removeChild(this.box); }

        this.box = new createjs.Shape();
        this.box.width = world.stage.canvas.width / world.mapWidth * this.width;
        this.box.height = world.stage.canvas.height / world.mapHeight * this.height;
        this.box.graphics.beginStroke("#FFF").setStrokeStyle(2).drawRect(0, 0, this.box.width, this.box.height);
                                              
        world.minimap.addChild(this.box);

        this.positionViewBox();
    },

    positionViewBox: function() {
        this.box.x = -world.mapContainer.x / world.mapWidth * this.width;
        this.box.y = -world.mapContainer.y / world.mapHeight * this.height;

        world.minimap.setChildIndex(minimap.box, world.minimap.children.length - 1);

        world.minimap.update();
    },

    onClick: function(e) {
        world.stage.removeChild(ui.contextMenu);

        var cornerX = e.stageX - this.box.width / 2;
        var cornerY = e.stageY - this.box.height / 2;

        scroll.scrollTo(-world.mapWidth * cornerX / this.width, -world.mapHeight * cornerY / this.height);
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
