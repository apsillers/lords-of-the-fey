var scroll = {
    scrollX: 0,
    scrollY: 0,
    scrollInterval: null,
    scrollPeriod: 50,
    scrollDist: 3,
    scrollFunc: function() {
        var stage = world.stage;
	if((scroll.scrollX < 0 && world.mapContainer.x < 0) ||
	   (scroll.scrollX > 0 && world.mapContainer.x > -world.mapContainer.getBounds().width + stage.canvas.width)) {
	    world.mapContainer.x -= scroll.scrollX;
	}
	if((scroll.scrollY < 0 && world.mapContainer.y < 0) ||
	   (scroll.scrollY > 0 && world.mapContainer.y > -world.mapContainer.getBounds().height + stage.canvas.height)) {
	    world.mapContainer.y -= scroll.scrollY;
	}
	world.stage.update();
	if(scroll.scrollX == 0 && scroll.scrollY == 0) { clearInterval(scroll.scrollInterval); scroll.scrollInterval = null; }
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
