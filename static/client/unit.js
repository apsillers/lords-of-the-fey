var unitLib = {

    protoList: ["grunt", "scout"],
    protos: {},

    init: function() {
        
    },
    
    create: function(unitData, proto) {
        var unit = Object.create(proto);
	unit.movesLeft = unitData.moveLeft;
        unit.hp = unitData.hp;
        unit.xp = unitData.xp;

        unit.team = unitData.team;
        unit.shape = new createjs.Bitmap(proto.imgObj);
        
        return unit;
    }
    
}

var genId;
(function() {
    var id = 0;
    genId = function() { return id++; }
})();
