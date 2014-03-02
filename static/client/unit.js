var unitLib = {

    protoList: ["grunt", "scout"],
    protos: {},

    init: function() {
        
    },
    
    create: function(unitData, proto) {
        var unit = Object.create(proto);
	unit.moveLeft = unitData.moveLeft;
        unit.hp = unitData.hp;
        unit.xp = unitData.xp;

        unit.team = unitData.team;
        unit.shape = new createjs.Container();
	unit.shape.addChild(new createjs.Bitmap(proto.imgObj));

	this.drawHpBar(unit);

        return unit;
    },

    drawHpBar: function(unit) {
	if(unit.healthBar) { unit.shape.removeChild(unit.healthBar); }

	var hpRatio = unit.hp / unit.maxHp;

	var barColor = ["#D00", "#DD0"][Math.floor(hpRatio * 3)] || "#0D0";

	unit.healthBar = new createjs.Shape();
	unit.healthBar.graphics.beginFill(barColor).drawRect(54, 8.5 + 20 * (1 - hpRatio), 4, 20 * hpRatio);
	unit.healthBar.graphics.beginFill("rgba(0,0,0,0)").beginStroke("#FFF").setStrokeStyle(1).drawRect(53.5, 8.5, 4, 20);
        unit.shape.addChild(unit.healthBar);
    }
    
}

var unitProto = {
    
}

var genId;
(function() {
    var id = 0;
    genId = function() { return id++; }
})();
