var menuControl = {
    showingMenu: false,

    init: function() {
        var m = this;
        $("#top-menu-button").click(function() {
            if(m.showingMenu) { m.hideMenu(); }
            else { m.showMenu(); }
        });

        $("#top-menu-players").click(function() { ui.showPlayerStats(); m.hideMenu(); });

        $("#top-menu-credits").click(function() { ui.showCredits(); m.hideMenu(); });
        $("#close-credits").click(function() { ui.hideCredits(); m.hideMenu(); });

        function animationSpeedSetter(speed) {
            return function() {
                $(".speed-mark").text("");
                $(".speed-mark", this).text("✓");
                localStorage["animationspeed"] = this.id.split("-").pop();
                ui.animationFactor = speed;
                m.hideMenu();
            }
        }

        $("#top-menu-animation-speed-1").click(animationSpeedSetter(0.66));
        $("#top-menu-animation-speed-2").click(animationSpeedSetter(0.44));
        $("#top-menu-animation-speed-3").click(animationSpeedSetter(0.33));
        $("#top-menu-animation-speed-4").click(animationSpeedSetter(0.22));

        var speedTarget = $("#top-menu-animation-speed-" + parseInt(localStorage["animationspeed"],10));
        if(!speedTarget.length) {
            speedTarget = $("#top-menu-animation-speed-1");
        }
        speedTarget.click();

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
