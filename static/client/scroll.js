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
var scroll = {
    scrollX: 0,
    scrollY: 0,
    scrollInterval: null,
    scrollPeriod: 25,
    scrollDist: 50,
    scrollFunc: function() {
	scroll.applyScroll(scroll.scrollX, scroll.scrollY);
	if(!world.stage.mouseInBounds || (scroll.scrollX == 0 && scroll.scrollY == 0)) {
	    clearInterval(scroll.scrollInterval); scroll.scrollInterval = null;
	}
    },
    applyScroll: function(dx,dy) {
	this.scrollTo(world.mapContainer.x - dx, world.mapContainer.y - dy);		 
    },
    scrollTo: function(x, y) {
	if(world.stage.children.indexOf(ui.contextMenu) != -1) { return; }

        var stage = world.stage;

	var mapWidth = Space.WIDTH + ((Space.WIDTH * 3/4 + 0.6) * (world.maxX));
	var mapHeight = Space.HEIGHT * (world.maxY + 1.5);

	world.mapContainer.x = Math.min(0, Math.max(x, stage.canvas.width - mapWidth));
	world.mapContainer.y = Math.max(Math.min(y, 0), stage.canvas.height - mapHeight);
	world.stage.update();

	minimap.positionViewBox();
    },
    addScroll: function() {
        var stage = world.stage;
        world.stage.addEventListener("stagemousemove", function(e) {
            if(e.stageX > stage.canvas.width - stage.canvas.width / 10){
		scroll.scrollX = scroll.scrollDist;
		if(!scroll.scrollInterval) { scroll.scrollInterval = setInterval(scroll.scrollFunc, scroll.scrollPeriod); }
	    } else if(e.stageX < stage.canvas.width / 10) {
		scroll.scrollX = -scroll.scrollDist;
		if(!scroll.scrollInterval) { scroll.scrollInterval = setInterval(scroll.scrollFunc, scroll.scrollPeriod); }
	    } else {
		scroll.scrollX = 0;
	    }

            if(e.stageY > stage.canvas.height - stage.canvas.height / 10){
		scroll.scrollY = scroll.scrollDist;
		if(!scroll.scrollInterval) { scroll.scrollInterval = setInterval(scroll.scrollFunc, scroll.scrollPeriod); }
	    } else if(e.stageY < stage.canvas.height / 10) {
		scroll.scrollY = -scroll.scrollDist;
		if(!scroll.scrollInterval) { scroll.scrollInterval = setInterval(scroll.scrollFunc, scroll.scrollPeriod); }
	    } else {
		scroll.scrollY = 0;
	    }
        })
    }
}

$("html, body").css("margin", 0)

/*
$(window).resize(function(e) {
    world.stage.canvas.width = $(window).width();
    world.stage.canvas.height = $(window).height();
    world.stage.update();
});
*/
