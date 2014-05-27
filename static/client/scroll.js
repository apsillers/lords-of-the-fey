var scroll = {
    scrollX: 0,
    scrollY: 0,
    scrollInterval: null,
    scrollPeriod: 50,
    scrollDist: 3,
    scrollFunc: function() {
	scroll.applyScroll(scroll.scrollX, scroll.scrollY);
	if(scroll.scrollX == 0 && scroll.scrollY == 0) { clearInterval(scroll.scrollInterval); scroll.scrollInterval = null; }
    },
    applyScroll: function(dx,dy) {
        var stage = world.stage;
	world.mapContainer.x = Math.min(0, Math.max(world.mapContainer.x - dx, -world.mapContainer.getBounds().width + stage.canvas.width));
	world.mapContainer.y = Math.max(Math.min(world.mapContainer.y - dy, 0), -world.mapContainer.getBounds().height + stage.canvas.height);
	world.stage.update();
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
