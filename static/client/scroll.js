var scroll = {
    addScroll: function() {
        var stage = world.stage;
        world.stage.addEventListener("stagemousemove", function(e) {
            //console.log(e);
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
