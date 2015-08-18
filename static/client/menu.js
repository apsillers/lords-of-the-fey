var menuControl = {
    showingMenu: false,

    init: function() {
        var m = this;
        $("#top-menu-button").click(function() {
            if(m.showingMenu) { m.hideMenu(); }
            else { m.showMenu(); }
        });

        $("#top-menu-animation-speed-1").click(function() { ui.animationFactor = 0.66; m.hideMenu(); });
        $("#top-menu-animation-speed-2").click(function() { ui.animationFactor = 0.44; m.hideMenu(); });
        $("#top-menu-animation-speed-3").click(function() { ui.animationFactor = 0.33; m.hideMenu(); });
        $("#top-menu-animation-speed-4").click(function() { ui.animationFactor = 0.22; m.hideMenu(); });
        $("#top-menu-fullscreen").click(function() {
            var body = document.documentElement;
            if(document.fullscreenElement || document.mozFullScreenElement ||
               document.webkitFullscreenElement || document.msFullscreenElement) {
                (document.exitFullscreen||document.webkitExitFullscreen||document.body.mozCancelFullScreen||elem.msExitFullscreen).call(document);
            } else {
                (body.requestFullscreen||body.webkitRequestFullscreen||document.body.mozRequestFullScreen||elem.msRequestFullscreen).call(body);
            }
            m.hideMenu();
         });
    },

    showMenu: function() {
        ui.hideMenus();
        this.showingMenu = true;
        ui.showingMenu = true;
        $("#top-menu-list").show();
    },

    hideMenu: function() {
        this.showingMenu = false;
        ui.showingMenu = false;
        $("#top-menu-list").hide();
    }
}
