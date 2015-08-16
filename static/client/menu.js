var menuControl = {
    showingMenu: false,

    init: function() {
        var m = this;
        $("#top-menu-button").click(function() {
            if(m.showingMenu) { m.hideMenu(); }
            else { m.showMenu(); }
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
